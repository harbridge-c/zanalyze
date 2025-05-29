#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import { fromEml } from '../util/email';
import type { EmailAddress } from '@vortiq/eml-parse-js';
import { create as createStorage } from '../util/storage';
import { getLogger, setLogLevel, initLogging } from '../logging';

const program = new Command();
program
    .requiredOption('-d, --directory <directory>', 'Directory containing .eml files')
    .requiredOption('-H, --header <header>', 'Header to extract addresses from (e.g., From, To, Cc, Bcc)')
    .option('-n, --num-rows <numRows>', 'Number of rows to display', '50')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-D, --debug', 'Enable debug logging');
program.parse(process.argv);

const { directory, header, numRows, verbose, debug } = program.opts<{ directory: string; header: string; numRows: string; verbose?: boolean; debug?: boolean }>();

// Set up logging
if (debug) {
    setLogLevel('debug');
} else if (verbose) {
    setLogLevel('verbose');
}
initLogging();
const logger = getLogger();

const storage = createStorage({
    log: (message: string, ...args: any[]) => {
        // Suppress 'is not a directory' for .eml files
        if (typeof message === 'string' && message.endsWith('is not a directory') && message.includes('.eml')) {
            return;
        }
        logger.debug(message, ...args);
    }
});

function extractHeaderValuesFromEml(eml: any, header: string): string[] {
    const key = header.toLowerCase();
    if (["from", "to", "cc", "bcc"].includes(key)) {
        // Address headers: extract email addresses
        let addresses: EmailAddress[] | undefined;
        switch (key) {
            case 'from':
                addresses = eml.from;
                break;
            case 'to':
                addresses = eml.to;
                break;
            case 'cc':
                addresses = eml.cc;
                break;
            case 'bcc':
                addresses = eml.bcc;
                break;
            default:
                addresses = undefined;
        }
        if (!addresses || !Array.isArray(addresses)) return [];
        return addresses.map(addr => addr.email).filter(Boolean);
    } else {
        // Non-address headers: extract value as string(s)
        const value = eml[key];
        if (!value) return [];
        if (Array.isArray(value)) {
            // If array, flatten and stringify
            return value.map(v => (typeof v === 'string' ? v : JSON.stringify(v)));
        } else if (typeof value === 'string') {
            return [value];
        } else {
            return [JSON.stringify(value)];
        }
    }
}

async function walkEmlFiles(current: string, files: string[]): Promise<void> {
    const entries = await storage.listFiles(current);
    for (const entry of entries) {
        const fullPath = path.join(current, entry);
        const isDir = await storage.isDirectory(fullPath).catch(() => false);
        if (isDir) {
            await walkEmlFiles(fullPath, files);
        } else if (entry.endsWith('.eml')) {
            files.push(fullPath);
        }
    }
}

async function parseEmlAddresses(dir: string, header: string): Promise<Map<string, number>> {
    const counter = new Map<string, number>();
    const files: string[] = [];
    await walkEmlFiles(dir, files);

    for (const file of files) {
        try {
            const emlRaw = await storage.readFile(file, 'utf8');
            const eml = fromEml(emlRaw);
            const values = extractHeaderValuesFromEml(eml, header);
            for (const value of values) {
                counter.set(value, (counter.get(value) || 0) + 1);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`Error reading ${file}: ${e}`);
        }
    }
    return counter;
}

function printMarkdownHistogram(counter: Map<string, number>, maxRows: number) {
    const entries = [...counter.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    logger.info('| Email Address                          | Count |   %   |');
    logger.info('|----------------------------------------|-------|-------|');
    entries.slice(0, maxRows).forEach(([email, count]) => {
        const percent = ((count / total) * 100).toFixed(2);
        logger.info(`| ${email.padEnd(38)} | ${String(count).padStart(5)} | ${percent.padStart(5)}% |`);
    });
}

(async () => {
    const histogram = await parseEmlAddresses(directory, header);
    printMarkdownHistogram(histogram, parseInt(numRows, 10));
})(); 
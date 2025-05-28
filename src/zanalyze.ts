#!/usr/bin/env node
import * as DreadCabinet from '@theunwalked/dreadcabinet';
import { Feature } from '@theunwalked/dreadcabinet';
import * as CardiganTime from '@theunwalked/cardigantime';
import 'dotenv/config';
import * as Arguments from './arguments';
import {
    ALLOWED_EMAIL_EXTENSIONS,
    ALLOWED_INPUT_FILENAME_OPTIONS,
    ALLOWED_INPUT_STRUCTURES,
    ALLOWED_OUTPUT_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
    DEFAULT_CONFIGURATION_DIRECTORY,
    DEFAULT_EMAIL_EXTENSIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_INPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_STRUCTURE,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_OUTPUT_FILENAME_OPTIONS,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_TIMEZONE,
    PROGRAM_NAME,
    VERSION
} from './constants';
import { ExitError } from './error/ExitError';
import { getLogger, setLogLevel, initLogging } from './logging';
import path from 'path';
import * as Processor from './processor';
import { Config, ConfigSchema, DateRange } from './types';
export async function main() {

    // eslint-disable-next-line no-console
    console.info(`Starting ${PROGRAM_NAME}: ${VERSION}`);

    const dreadcabinetOptions = {
        defaults: {
            timezone: DEFAULT_TIMEZONE,
            extensions: DEFAULT_EMAIL_EXTENSIONS, // Default to .eml files
            inputStructure: DEFAULT_INPUT_STRUCTURE,
            inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
            outputStructure: DEFAULT_OUTPUT_STRUCTURE,
            outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
            inputDirectory: DEFAULT_INPUT_DIRECTORY,
            outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
        },
        allowed: {
            extensions: ALLOWED_EMAIL_EXTENSIONS,
            outputStructures: ALLOWED_OUTPUT_STRUCTURES,
            outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
            inputStructures: ALLOWED_INPUT_STRUCTURES,
            inputFilenameOptions: ALLOWED_INPUT_FILENAME_OPTIONS,
        },
        features: [
            'input',
            'output',
            'structured-output',
            'structured-input',
            'extensions'
        ] as Feature[],
        addDefaults: false,
    };

    const dreadcabinet = DreadCabinet.create(dreadcabinetOptions);

    // Create a type-erased helper function to avoid excessive type instantiation
    function mergeShapes<T extends Record<string, any>>(shapes: T[]): Record<string, any> {
        return shapes.reduce((result, shape) => ({ ...result, ...shape }), {});
    }

    // Use type erasure to avoid excessive type instantiation
    const configShape = mergeShapes([
        ConfigSchema.shape,
        DreadCabinet.ConfigSchema.shape
    ]);

    const cardigantime = CardiganTime.create({
        defaults: {
            configDirectory: DEFAULT_CONFIGURATION_DIRECTORY,
        },
        configShape: configShape,
    });


    const [config, dateRange]: [Config, DateRange] = await Arguments.configure(dreadcabinet, cardigantime);

    // Set log level based on verbose flag
    if (config.verbose === true) {
        setLogLevel('verbose');
    }
    if (config.debug === true) {
        setLogLevel('debug');
    }
    if (config.silly === true) {
        setLogLevel('silly');
    }

    const logger = getLogger();
    initLogging();
    dreadcabinet.setLogger(logger);

    logger.debug('Debug logging enabled');

    try {
        // --- dreadcabinet Operation ---
        const operator: DreadCabinet.Operator = await dreadcabinet.operate(config);
        const processor: Processor.Instance = await Processor.create(config, operator);

        // TODO: Integrate dreadcabinet operator with your EML processing logic
        // Example: Iterate through files using the operator
        const processedFiles: string[] = [];
        let successCount = 0;
        let errorCount = 0;

        await operator.process(async (file: string) => {
            logger.verbose(`Processing file: ${file}`);
            try {
                await processor.process(file);
                processedFiles.push(file);
                successCount++;
            } catch (err: any) {
                errorCount++;
                logger.warn(`Failed to process ${file}: ${err.message}`);
            }
            return;
        }, { start: dateRange.start, end: dateRange.end }, 3);

        const total = successCount + errorCount;
        logger.info(`Processed ${total} files (${successCount} successful, ${errorCount} errors)`);
        if (config.verbose && processedFiles.length > 0) {
            const sample = processedFiles.slice(0, 3).map(f => path.basename(f));
            logger.info(`First ${sample.length}: ${sample.join(', ')}`);
        }
        // --- End dreadcabinet Operation ---

    } catch (error: any) {
        if (error instanceof ExitError) {
            logger.error('Exiting due to Error');
        } else {
            logger.error('Exiting due to Error: %s', error.message);
        }
        process.exit(1);
    }
}


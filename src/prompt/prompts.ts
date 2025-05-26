import { Builder, createParameters, Model, Parameters, Prompt } from '@riotprompt/riotprompt';
import path from 'path';
import { Classifications, Events, People, Transactions } from 'phases/process';
import { fileURLToPath } from 'url';
import { DEFAULT_CHARACTER_ENCODING, DEFAULT_INSTRUCTIONS_CLASSIFY_FILE, DEFAULT_INSTRUCTIONS_EVENT_SENTRY_FILE, DEFAULT_INSTRUCTIONS_PERSON_SENTRY_FILE, DEFAULT_INSTRUCTIONS_RECEIPT_FILE, DEFAULT_INSTRUCTIONS_RECEIPT_SENTRY_FILE, DEFAULT_INSTRUCTIONS_SUMMARIZE_FILE, DEFAULT_PERSONA_CLASSIFIER_FILE, DEFAULT_PERSONA_EVENT_SENTRY_FILE, DEFAULT_PERSONA_PERSON_SENTRY_FILE, DEFAULT_PERSONA_RECEIPT_FILE, DEFAULT_PERSONA_RECEIPT_SENTRY_FILE, DEFAULT_PERSONA_SUMMARIZE_FILE, DEFAULT_PERSONA_BILL_SENTRY_FILE, DEFAULT_INSTRUCTIONS_BILL_SENTRY_FILE, DEFAULT_PERSONA_BILL_FILE, DEFAULT_INSTRUCTIONS_BILL_FILE } from '../constants';
import { getLogger } from '../logging';
import { Config } from '../types';
import * as Storage from '../util/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Factory {
    createClassificationPrompt: (text: string, headers: any) => Promise<Prompt>;
    createEventSentryPrompt: (text: string, headers: any, classifications: Classifications) => Promise<Prompt>;
    createPersonSentryPrompt: (text: string, headers: any, classifications: Classifications) => Promise<Prompt>;
    createReceiptSentryPrompt: (text: string, headers: any, classifications: Classifications) => Promise<Prompt>;
    createBillSentryPrompt: (text: string, headers: any, classifications: Classifications) => Promise<Prompt>;
    createSummarizePrompt: (text: string, headers: any, events: Events, people: People, classifications: Classifications) => Promise<Prompt>;
    createReceiptPrompt: (text: string, headers: any, events: Events, people: People, classifications: Classifications, transactions: Transactions) => Promise<Prompt>;
    createBillPrompt: (text: string, headers: any, events: Events, people: People, classifications: Classifications, bills: any) => Promise<Prompt>;
}

export const create = async (model: Model, config: Config): Promise<Factory> => {
    const logger = getLogger();
    const storage = Storage.create({ log: logger.debug });
    const taxonomy = await storage.readFile(path.join(__dirname, "../classification/taxonomy.yaml"), DEFAULT_CHARACTER_ENCODING);
    const taxonomyGuidance = await storage.readFile(path.join(__dirname, "../classification/taxonomy.md"), DEFAULT_CHARACTER_ENCODING);


    const createClassificationPrompt = async (text: string, headers: any): Promise<Prompt> => {
        const parameters: Parameters = createParameters({
            taxonomy,
            taxonomyGuidance,
        });

        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
            parameters,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_CLASSIFIER_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_CLASSIFY_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }

        const prompt = builder.build();
        return prompt;
    };

    const createEventSentryPrompt = async (text: string, headers: any, classifications: Classifications): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_EVENT_SENTRY_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_EVENT_SENTRY_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }

        const prompt = builder.build();
        return prompt;
    };

    const createPersonSentryPrompt = async (text: string, headers: any, classifications: Classifications): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_PERSON_SENTRY_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_PERSON_SENTRY_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }

        const prompt = builder.build();
        return prompt;
    }

    const createReceiptSentryPrompt = async (text: string, headers: any, classifications: Classifications): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_RECEIPT_SENTRY_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_RECEIPT_SENTRY_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }
        const prompt = builder.build();
        return prompt;
    }

    const createBillSentryPrompt = async (text: string, headers: any, classifications: Classifications): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_BILL_SENTRY_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_BILL_SENTRY_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }
        const prompt = builder.build();
        return prompt;
    }

    const createSummarizePrompt = async (text: string, headers: any, events: Events, people: People, classifications: Classifications): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_SUMMARIZE_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_SUMMARIZE_FILE);
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(JSON.stringify(people, null, 2), { title: 'people' });
        builder = await builder.addContent(JSON.stringify(events, null, 2), { title: 'events' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }
        const prompt = builder.build();
        return prompt;
    };

    const createReceiptPrompt = async (text: string, headers: any, events: Events, people: People, classifications: Classifications, transactions: Transactions): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_RECEIPT_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_RECEIPT_FILE);
        builder = await builder.addContent(JSON.stringify(transactions, null, 2), { title: 'transactions' });
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(JSON.stringify(people, null, 2), { title: 'people' });
        builder = await builder.addContent(JSON.stringify(events, null, 2), { title: 'events' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }
        const prompt = builder.build();
        return prompt;
    };

    const createBillPrompt = async (text: string, headers: any, events: Events, people: People, classifications: Classifications, bills: any): Promise<Prompt> => {
        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });
        builder = await builder.addPersonaPath(DEFAULT_PERSONA_BILL_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_BILL_FILE);
        builder = await builder.addContent(JSON.stringify(bills, null, 2), { title: 'bills' });
        builder = await builder.addContent(JSON.stringify(headers, null, 2), { title: 'headers' });
        builder = await builder.addContent(JSON.stringify(classifications, null, 2), { title: 'classifications' });
        builder = await builder.addContent(JSON.stringify(people, null, 2), { title: 'people' });
        builder = await builder.addContent(JSON.stringify(events, null, 2), { title: 'events' });
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }
        const prompt = builder.build();
        return prompt;
    };

    return {
        createClassificationPrompt,
        createEventSentryPrompt,
        createPersonSentryPrompt,
        createReceiptSentryPrompt,
        createBillSentryPrompt,
        createSummarizePrompt,
        createReceiptPrompt,
        createBillPrompt,
    };
}


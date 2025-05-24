import { Builder, createParameters, Model, Parameters, Prompt } from '@riotprompt/riotprompt';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_CHARACTER_ENCODING, DEFAULT_INSTRUCTIONS_CLASSIFY_FILE, DEFAULT_INSTRUCTIONS_COMPOSE_FILE, DEFAULT_PERSONA_CLASSIFIER_FILE, DEFAULT_PERSONA_YOU_FILE } from '../constants';
import { getLogger } from '../logging';
import { Config } from '../types';
import * as Storage from '../util/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Factory {
    createClassificationPrompt: (text: string) => Promise<Prompt>;
    createComposePrompt: (text: string) => Promise<Prompt>;
}

export const create = async (model: Model, config: Config): Promise<Factory> => {
    const logger = getLogger();
    const storage = Storage.create({ log: logger.debug });
    const taxonomy = await storage.readFile(path.join(__dirname, "../classification/taxonomy.yaml"), DEFAULT_CHARACTER_ENCODING);

    const createClassificationPrompt = async (text: string): Promise<Prompt> => {
        const parameters: Parameters = createParameters({
            taxonomy,
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
        builder = await builder.addContent(text, { title: 'email' });
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }

        const prompt = builder.build();
        return prompt;
    };

    const createComposePrompt = async (text: string): Promise<Prompt> => {

        let builder: Builder.Instance = Builder.create({
            logger,
            overrides: config.overrides,
            basePath: __dirname,
            overridePath: config.configDirectory,
        });

        builder = await builder.addPersonaPath(DEFAULT_PERSONA_YOU_FILE);
        builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_COMPOSE_FILE);
        builder = await builder.addContent(text);
        if (config.contextDirectories) {
            builder = await builder.loadContext(config.contextDirectories);
        }

        const prompt = builder.build();
        return prompt;
    }

    return {
        createClassificationPrompt,
        createComposePrompt,
    };
}


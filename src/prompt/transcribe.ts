import { Builder, Chat, Prompt } from "@riotprompt/riotprompt";
import { getLogger } from "logging";
import { DEFAULT_INSTRUCTIONS_TRANSCRIBE_FILE, DEFAULT_PERSONA_TRANSCRIBE_FILE } from '../constants';
import { Config } from '../types';

/**
 * Creates a prompt for the transcription formatting task
 */
export const createTranscribePrompt = async (
    transcriptionText: string,
    config: Config
): Promise<Prompt> => {
    const logger = getLogger();

    let builder = Builder.create({
        logger,
        overrides: config.overrides,
        basePath: __dirname,
        overridePath: config.configDirectory,
    });

    builder = await builder.addPersonaPath(DEFAULT_PERSONA_TRANSCRIBE_FILE);
    builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_TRANSCRIBE_FILE);
    builder = await builder.addContent(transcriptionText);
    if (config.contextDirectories && config.contextDirectories.length > 0) {
        builder = await builder.loadContext(config.contextDirectories);
    }

    const prompt = builder.build();
    return prompt;
};

/**
 * Factory interface for transcribe prompts
 */
export interface Factory {
    createTranscribePrompt: (transcriptionText: string) => Promise<Prompt>;
}

/**
 * Create a factory for transcribe prompts
 */
export const create = (model: Chat.Model, config: Config): Factory => {
    return {
        createTranscribePrompt: async (transcriptionText: string): Promise<Prompt> => {
            return createTranscribePrompt(transcriptionText, config);
        }
    };
}; 
import { EmlContent } from '@vortiq/eml-parse-js';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { Connection, Context, createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionMessageParam } from 'openai/resources';
import path from 'path';
import { z } from 'zod';
import { DEFAULT_CHARACTER_ENCODING } from '../constants';
import { getLogger } from '../logging';
import * as Prompt from '../prompt/prompts';
import { Config as ZanalyzeConfig } from '../types';
import { stringifyJSON } from '../util/general';
import * as OpenAI from '../util/openai';
import * as Storage from '../util/storage';
import { ClassificationsSchema } from './process';
import { EVENT_SENTRY_PHASE_NODE_NAME } from './sentry/event';
import { PERSON_SENTRY_PHASE_NODE_NAME } from './sentry/person';

export const CLASSIFY_PHASE_NAME = 'classify';
export const CLASSIFY_PHASE_NODE_NAME = 'classify_node';

export interface Input extends PhaseInput {
    eml: EmlContent;
    outputPath: string;
    detailPath: string;
    hash: string;
    filename: string;
    contextPath: string;
};

export interface Output extends PhaseOutput {
    classifications: string;
};

// Helper function to promisi   fy ffmpeg.
export interface ClassifyPhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface ClassifyPhaseNode extends PhaseNode<Input, Output> {
    phase: ClassifyPhase;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const create = async (config: Config): Promise<ClassifyPhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

    const storage = Storage.create({ log: logger.debug });

    const execute = async (input: Input): Promise<Output> => {

        if (!input.eml) {
            throw new Error("eml is required for filter function");
        }

        const responseDetailFile = path.join(input.detailPath, `${input.filename.replace('output', 'classify_response')}.json`);

        const prompt = await prompts.createClassificationPrompt(input.eml.text || input.eml.html || '', input.eml.headers);
        // Generate classification prompt using the transcription text
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);
        const requestDetailFile = path.join(input.detailPath, `${input.filename.replace('output', 'classify_request')}.json`);

        await storage.writeFile(requestDetailFile, JSON.stringify(chatRequest, null, 2), DEFAULT_CHARACTER_ENCODING);

        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ classifications: ClassificationsSchema }), 'classifications'),
            model: config.classifyModel,
            debug: config.debug,
            debugFile: responseDetailFile,
        });

        logger.debug('Context Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

        return contextCompletion;
    }

    const classifyPhase = createPhase(
        CLASSIFY_PHASE_NAME,
        {
            execute,
        }
    );

    const createConnections = (): Connection<Output, Context>[] => {
        const transform = async (output: Output, context: Context): Promise<[Input, Context]> => {
            const input: Input = {
                ...context,
                ...output,
            } as any;
            return [input, input as Context];
        }

        const toEventSentry = createConnection('toEventSentry', EVENT_SENTRY_PHASE_NODE_NAME, { transform });
        const toPersonSentry = createConnection('toPersonSentry', PERSON_SENTRY_PHASE_NODE_NAME, { transform });

        const connections: Connection<Output, Context>[] = [toEventSentry, toPersonSentry];

        return connections;
    }

    const connections = createConnections();

    return createPhaseNode(
        CLASSIFY_PHASE_NODE_NAME,
        classifyPhase,
        {
            next: connections as any,
        }
    ) as ClassifyPhaseNode;
}





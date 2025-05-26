import { createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { EmlContent } from '@vortiq/eml-parse-js';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionMessageParam } from 'openai/resources';
import path from 'path';
import { z } from 'zod';
import { DEFAULT_CHARACTER_ENCODING } from '../../constants';
import { getLogger } from '../../logging';
import * as Prompt from '../../prompt/prompts';
import { Config as ZanalyzeConfig } from '../../types';
import { stringifyJSON } from '../../util/general';
import * as OpenAI from '../../util/openai';
import * as Storage from '../../util/storage';
import { Classifications, Context, Events, EventsSchema } from '../process';
import { SENTRY_AGGREGATOR_NODE_NAME } from './aggregator';

export const EVENT_SENTRY_PHASE_NAME = 'event_sentry';
export const EVENT_SENTRY_PHASE_NODE_NAME = 'event_sentry_node';

export interface Input extends PhaseInput {
    eml: EmlContent;
    classifications: Classifications;
    outputPath: string;
    detailPath: string;
    hash: string;
    filename: string;
    contextPath: string;
};

export interface Output extends PhaseOutput {
    events: Events;
};

// Helper function to promisi   fy ffmpeg.
export interface EventSentryPhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface EventSentryPhaseNode extends PhaseNode<Input, Output> {
    phase: EventSentryPhase;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const create = async (config: Config): Promise<EventSentryPhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

    const storage = Storage.create({ log: logger.debug });

    const execute = async (input: Input): Promise<Output> => {

        if (!input.eml) {
            throw new Error("eml is required for filter function");
        }

        const responseDetailFile = path.join(input.detailPath, `${input.filename.replace('output', 'event_schema_response')}.json`);

        // If the response file exists, read and return its contents
        if (await storage.exists(responseDetailFile)) {
            const fileContents = await storage.readFile(responseDetailFile, DEFAULT_CHARACTER_ENCODING);
            let parsed: any;
            try {
                parsed = JSON.parse(fileContents);
            } catch (err) {
                throw new Error(`Failed to parse cached event_schema_response: ${err}`);
            }
            // Validate using zod
            const schema = z.object({ events: EventsSchema });
            const result = schema.safeParse(parsed);
            if (!result.success) {
                throw new Error(`Cached event_schema_response failed validation: ${result.error}`);
            }
            return result.data;
        }

        const prompt = await prompts.createEventSentryPrompt(input.eml.text || input.eml.html || '', input.eml.headers, input.classifications);
        // Generate classification prompt using the transcription text
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);

        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ events: EventsSchema }), 'events'),
            model: config.classifyModel,
        });

        logger.debug('Context Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));
        await storage.writeFile(responseDetailFile, JSON.stringify(contextCompletion, null, 2), DEFAULT_CHARACTER_ENCODING);

        return contextCompletion;
    }

    const eventSentryPhase = createPhase(
        EVENT_SENTRY_PHASE_NAME,
        {
            execute,
        }
    );

    // Connect to summarize phase
    const createConnections = () => {
        const transform = async (output: Output, context: Context): Promise<[any, Context]> => {
            const input = {
                ...context,
                ...output,
            };
            return [input, input as Context];
        };
        return [createConnection('toSummarize', SENTRY_AGGREGATOR_NODE_NAME, { transform })] as const;
    };

    return createPhaseNode(
        EVENT_SENTRY_PHASE_NODE_NAME,
        eventSentryPhase,
        {
            next: createConnections(),
        }
    ) as EventSentryPhaseNode;
}





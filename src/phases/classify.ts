import { Connection, Context, createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod } from '@maxdrellin/xenocline';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { EmlContent } from '@vortiq/eml-parse-js';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionMessageParam } from 'openai/resources';
import { z } from 'zod';
import { getLogger } from '../logging';
import * as Prompt from '../prompt/prompts';
import { Config as ZanalyzeConfig } from '../types';
import { stringifyJSON } from '../util/general';
import * as OpenAI from '../util/openai';
import { BILL_SENTRY_PHASE_NODE_NAME } from './sentry/bill';
import { EVENT_SENTRY_PHASE_NODE_NAME } from './sentry/event';
import { PERSON_SENTRY_PHASE_NODE_NAME } from './sentry/person';
import { RECEIPT_SENTRY_PHASE_NODE_NAME } from './sentry/receipt';

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
    classifications: Classifications;
};

// Helper function to promisi   fy ffmpeg.
export interface ClassifyPhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface ClassifyPhaseNode extends PhaseNode<Input, Output> {
    phase: ClassifyPhase;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const ClassificationSchema = z.object({
    coordinate: z.array(z.string()),
    strength: z.number(),
    reason: z.string(),
});

export const ClassificationsSchema = z.array(ClassificationSchema);

export type Classification = z.infer<typeof ClassificationSchema>;
export type Classifications = z.infer<typeof ClassificationsSchema>;

export const create = async (config: Config): Promise<ClassifyPhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

    const execute = async (input: Input): Promise<Output> => {

        if (!input.eml) {
            throw new Error("eml is required for filter function");
        }

        const prompt = await prompts.createClassificationPrompt(input.eml.text || input.eml.html || '', input.eml.headers);
        // Generate classification prompt using the transcription text
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);

        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ classifications: ClassificationsSchema }), 'classifications'),
            model: config.classifyModel,
        });

        logger.debug('Classify Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

        return contextCompletion;
    }

    const classifyPhase = createPhase(
        CLASSIFY_PHASE_NAME,
        {
            execute,
        }
    );

    const createConnections = (): Connection<Output, Context>[] => {
        logger.info('Classify Phase Transform');

        const transform = async (output: Output, context: Context): Promise<[Input, Context]> => {
            const input: Input = {
                ...context,
                ...output,
            } as any;
            return [input, input as Context];
        }

        const toEventSentry = createConnection('toEventSentry', EVENT_SENTRY_PHASE_NODE_NAME, { transform });
        const toPersonSentry = createConnection('toPersonSentry', PERSON_SENTRY_PHASE_NODE_NAME, { transform });
        const toReceiptSentry = createConnection('toReceiptSentry', RECEIPT_SENTRY_PHASE_NODE_NAME, { transform });
        const toBillSentry = createConnection('toBillSentry', BILL_SENTRY_PHASE_NODE_NAME, { transform });

        const connections: Connection<Output, Context>[] = [toEventSentry, toPersonSentry, toReceiptSentry, toBillSentry];


        return connections;
    }

    const connections = createConnections();

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    return createPhaseNode(
        CLASSIFY_PHASE_NODE_NAME,
        classifyPhase,
        {
            next: connections as any,
            process,
        }
    ) as ClassifyPhaseNode;
}





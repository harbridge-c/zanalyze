import { AggregationResult, Aggregator, AggregatorNode, Context, createAggregator, createAggregatorNode, createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { EmlContent } from '@vortiq/eml-parse-js';
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
import { Classifications, Events, People } from './process';


export const SUMMARIZE_PHASE_NAME = 'summarize';
export const SUMMARIZE_PHASE_NODE_NAME = 'summarize_node';
export const SUMMARIZE_AGGREGATOR_NAME = 'summarize_aggregator';
export const SUMMARIZE_AGGREGATOR_NODE_NAME = 'summarize_aggregator_node';

export interface Input extends PhaseInput {
    eml: EmlContent;
    outputPath: string;
    detailPath: string;
    hash: string;
    filename: string;
    contextPath: string;
    classifications: Classifications;
    events: Events;
    people: People;
};

export interface Output extends PhaseOutput {
    summary: string;
};

export interface SummarizePhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface SummarizePhaseNode extends PhaseNode<Input, Output> {
    phase: SummarizePhase;
}

export interface SummarizeAggregator extends Aggregator {
    aggregate: (input: PhaseInput, context: Context) => Promise<Readonly<AggregationResult<PhaseOutput>>>;
}

export interface SummarizeAggregatorNode extends AggregatorNode<PhaseOutput, Context> {
    aggregator: SummarizeAggregator;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const create = async (config: Config): Promise<SummarizePhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

    const storage = Storage.create({ log: logger.debug });

    const execute = async (input: Input): Promise<Output> => {
        if (!input.eml) {
            logger.error('eml is required for summarize function');
            throw new Error("eml is required for summarize function");
        }

        if (!input.events) {
            logger.error('events is required for summarize function');
            throw new Error("events is required for summarize function");
        }
        if (!input.people) {
            logger.error('people is required for summarize function');
            throw new Error("people is required for summarize function");
        }
        if (!input.classifications) {
            logger.error('classifications is required for summarize function');
            throw new Error("classifications is required for summarize function");
        }

        // Write summary to markdown file in output directory
        const summaryFilename = input.filename.replace(/output(\.[^.]*)?$/, 'summary.md');
        const summaryFilePath = path.join(input.outputPath, summaryFilename);

        // Check if summary file already exists
        if (await storage.exists(summaryFilePath)) {
            logger.debug('Summary file already exists, skipping generation: %s', summaryFilePath);
            const existingSummary = await storage.readFile(summaryFilePath, DEFAULT_CHARACTER_ENCODING);
            return { summary: existingSummary };
        }

        const prompt = await prompts.createSummarizePrompt(input.eml.text || input.eml.html || '', input.eml.headers, input.events, input.people, input.classifications);
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);

        // The summary is a string, so we expect { summary: string }
        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ summary: z.string() }), 'summary'),
            model: config.classifyModel,
        });

        logger.debug('Summary Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

        await storage.writeFile(summaryFilePath, contextCompletion.summary, DEFAULT_CHARACTER_ENCODING);

        return contextCompletion;
    }

    const summarizePhase = createPhase(
        SUMMARIZE_PHASE_NAME,
        {
            execute,
        }
    );

    // No next connections by default; will be connected from event/person sentry
    const summarizePhaseNode = createPhaseNode(
        SUMMARIZE_PHASE_NODE_NAME,
        summarizePhase
    ) as SummarizePhaseNode;

    return summarizePhaseNode;
}





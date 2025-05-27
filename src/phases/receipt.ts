import { AggregationResult, Aggregator, AggregatorNode, Context, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod, VerifyMethodResponse } from '@maxdrellin/xenocline';
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
import { Events } from './sentry/event';
import { People } from './sentry/person';
import { Transactions } from './sentry/receipt';
import { Classifications } from './classify';

export const RECEIPT_PHASE_NAME = 'receipt';
export const RECEIPT_PHASE_NODE_NAME = 'receipt_node';

export interface Input extends PhaseInput {
    eml: EmlContent;
    outputPath: string;
    filename: string;
    classifications: Classifications;
    events: Events;
    people: People;
    transactions: Transactions;
};

export interface Output extends PhaseOutput {
    receipt: string;
};

export interface ReceiptPhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface ReceiptPhaseNode extends PhaseNode<Input, Output> {
    phase: ReceiptPhase;
}

export interface SummarizeAggregator extends Aggregator {
    aggregate: (input: PhaseInput, context: Context) => Promise<Readonly<AggregationResult<PhaseOutput>>>;
}

export interface SummarizeAggregatorNode extends AggregatorNode<PhaseOutput, Context> {
    aggregator: SummarizeAggregator;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const create = async (config: Config): Promise<ReceiptPhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

    const storage = Storage.create({ log: logger.debug });

    const verify = async (input: Input): Promise<VerifyMethodResponse> => {
        const response: VerifyMethodResponse = {
            verified: true,
            messages: [],
        };

        if (!input.eml) {
            logger.error('eml is required for receipt function');
            response.verified = false;
            response.messages.push('eml is required for receipt function');
        }

        if (!input.events) {
            logger.error('events is required for receipt function');
            response.verified = false;
            response.messages.push('events is required for receipt function');
        }

        if (!input.people) {
            logger.error('people is required for receipt function');
            response.verified = false;
            response.messages.push('people is required for receipt function');
        }

        if (!input.classifications) {
            logger.error('classifications is required for receipt function');
            response.verified = false;
            response.messages.push('classifications is required for receipt function');
        }

        if (!input.transactions) {
            logger.error('transactions is required for receipt function');
            response.verified = false;
            response.messages.push('transactions is required for receipt function');
        }

        return response;
    }

    const execute = async (input: Input): Promise<Output> => {
        // Write receipt to markdown file in output directory
        const receiptFilename = input.filename.replace(/output(\.[^.]*)?$/, 'receipt.md');
        const receiptsDir = path.join(input.outputPath, 'receipts');
        await storage.createDirectory(receiptsDir);
        const receiptFilePath = path.join(receiptsDir, receiptFilename);

        // Check if receipt file already exists
        if (await storage.exists(receiptFilePath)) {
            logger.debug('Receipt file already exists, skipping generation: %s', receiptFilePath);
            const existingReceipt = await storage.readFile(receiptFilePath, DEFAULT_CHARACTER_ENCODING);
            return { receipt: existingReceipt };
        }

        const prompt = await prompts.createReceiptPrompt(input.eml.text || input.eml.html || '', input.eml.headers, input.events, input.people, input.classifications, input.transactions);
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);

        // The summary is a string, so we expect { summary: string }
        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ receipt: z.string() }), 'receipt'),
            model: config.classifyModel,
        });

        logger.debug('Receipt Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

        await storage.writeFile(receiptFilePath, contextCompletion.receipt, DEFAULT_CHARACTER_ENCODING);

        return {
            receipt: contextCompletion.receipt,
        };
    }

    const receiptPhase = createPhase(
        RECEIPT_PHASE_NAME,
        {
            execute,
            verify,
        }
    );

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    // No next connections by default; will be connected from event/person sentry
    const receiptPhaseNode = createPhaseNode(
        RECEIPT_PHASE_NODE_NAME,
        receiptPhase,
        {
            process,
        }
    ) as ReceiptPhaseNode;

    return receiptPhaseNode;
}





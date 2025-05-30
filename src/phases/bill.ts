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
import { Classifications } from './classify';
import { Events } from './sentry/event';
import { People } from './sentry/person';
import { Bills } from './sentry/bill';

export const BILL_PHASE_NAME = 'bill';
export const BILL_PHASE_NODE_NAME = 'bill_node';

export interface Input extends PhaseInput {
    eml: EmlContent;
    outputPath: string;
    filename: string;
    classifications: Classifications;
    events: Events;
    people: People;
    bills: Bills;
};

export interface Output extends PhaseOutput {
    bill: string;
};

export interface BillPhase extends Phase<Input, Output> {
    execute: (input: Input) => Promise<Output>;
}

export interface BillPhaseNode extends PhaseNode<Input, Output> {
    phase: BillPhase;
}

export interface BillAggregator extends Aggregator {
    aggregate: (input: PhaseInput, context: Context) => Promise<Readonly<AggregationResult<PhaseOutput>>>;
}

export interface BillAggregatorNode extends AggregatorNode<PhaseOutput, Context> {
    aggregator: BillAggregator;
}

export type Config = Pick<ZanalyzeConfig, 'configDirectory' | 'overrides' | 'model' | 'debug' | 'contextDirectories'>;

export const create = async (config: Config): Promise<BillPhaseNode> => {
    const logger = getLogger();

    const prompts = await Prompt.create(config.model as Chat.Model, config.configDirectory, config.overrides, { contextDirectories: config.contextDirectories });

    const storage = Storage.create({ log: logger.debug });


    const verify = async (input: Input): Promise<VerifyMethodResponse> => {
        const response: VerifyMethodResponse = {
            verified: true,
            messages: [],
        };

        if (!input.eml) {
            logger.error('eml is required for bill function');
            response.verified = false;
            response.messages.push('eml is required for bill function');
        }
        if (!input.events) {
            logger.error('events is required for bill function');
            response.verified = false;
            response.messages.push('events is required for bill function');
        }
        if (!input.people) {
            logger.error('people is required for bill function');
            response.verified = false;
            response.messages.push('people is required for bill function');
        }
        if (!input.classifications) {
            logger.error('classifications is required for bill function');
            response.verified = false;
            response.messages.push('classifications is required for bill function');
        }
        if (!input.bills) {
            logger.error('bills is required for bill function');
            response.verified = false;
            response.messages.push('bills is required for bill function');
        }

        return response;
    }

    const execute = async (input: Input): Promise<Output> => {
        // Write bill summary to markdown file in output directory
        const billFilename = input.filename.replace(/output(\.[^.]*)?$/, 'bill.md');
        const billsDir = path.join(input.outputPath, 'bills');
        await storage.createDirectory(billsDir);
        const billFilePath = path.join(billsDir, billFilename);

        // Check if bill file already exists
        if (await storage.exists(billFilePath)) {
            logger.debug('Bill file already exists, skipping generation: %s', billFilePath);
            const existingBill = await storage.readFile(billFilePath, DEFAULT_CHARACTER_ENCODING);
            return { bill: existingBill };
        }

        const prompt = await prompts.createBillPrompt(input.eml.text || input.eml.html || '', input.eml.headers, input.events, input.people, input.classifications, input.bills);
        const formatter = Formatter.create({ logger });
        const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);

        // The summary is a string, so we expect { bill: string }
        const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
            responseFormat: zodResponseFormat(z.object({ bill: z.string() }), 'bill'),
            model: config.model,
        });

        logger.debug('Bill Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

        await storage.writeFile(billFilePath, contextCompletion.bill, DEFAULT_CHARACTER_ENCODING);

        return {
            bill: contextCompletion.bill,
        };
    }

    const billPhase = createPhase(
        BILL_PHASE_NAME,
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

    // No next connections by default; will be connected from sentry
    const billPhaseNode = createPhaseNode(
        BILL_PHASE_NODE_NAME,
        billPhase,
        {
            process,
        }
    ) as BillPhaseNode;

    return billPhaseNode;
} 
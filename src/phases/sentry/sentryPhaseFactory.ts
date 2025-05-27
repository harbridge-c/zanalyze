import { createConnection, createPhase, createPhaseNode } from '@maxdrellin/xenocline';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionMessageParam } from 'openai/resources';
import { z, ZodTypeAny } from 'zod';
import { getLogger } from '../../logging';
import * as Prompt from '../../prompt/prompts';
import { Config as ZanalyzeConfig } from '../../types';
import { stringifyJSON } from '../../util/general';
import * as OpenAI from '../../util/openai';
import { Context } from '../process';
import { SENTRY_AGGREGATOR_NODE_NAME } from './aggregator';

interface SentryPhaseFactoryOptions {
    phaseName: string;
    phaseNodeName: string;
    outputKey: string;
    schema: ZodTypeAny;
    promptFunctionName: keyof Awaited<ReturnType<typeof Prompt.create>>;
}

export function createSentryPhaseNode(options: SentryPhaseFactoryOptions) {
    return async (config: Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>) => {
        const logger = getLogger();
        const prompts = await Prompt.create(config.classifyModel as Chat.Model, config as ZanalyzeConfig);

        const execute = async (input: any): Promise<any> => {
            if (!input.eml) {
                throw new Error('eml is required for sentry function');
            }

            // Dynamically call the correct prompt function
            const promptFn = prompts[options.promptFunctionName] as (...args: any[]) => Promise<any>;
            const prompt = await promptFn(
                input.eml.text || input.eml.html || '',
                input.eml.headers,
                input.classifications
            );
            const formatter = Formatter.create({ logger });
            const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, prompt);
            const contextCompletion = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], {
                responseFormat: zodResponseFormat(z.object({ [options.outputKey]: options.schema }), String(options.outputKey)),
                model: config.classifyModel,
            });
            logger.debug('Sentry Context Completion: \n\n%s\n\n', stringifyJSON(contextCompletion));

            return contextCompletion;
        };

        const sentryPhase = createPhase(options.phaseName, { execute });
        // Connect to summarize phase
        const createConnections = () => {
            const transform = async (output: any, context: Context): Promise<[any, Context]> => {
                const input = {
                    ...context,
                    ...output,
                };
                return [input, input as Context];
            };
            return [createConnection('toSummarize', SENTRY_AGGREGATOR_NODE_NAME, { transform })] as const;
        };
        return createPhaseNode(
            options.phaseNodeName,
            sentryPhase,
            {
                next: createConnections(),
            }
        );
    };
} 
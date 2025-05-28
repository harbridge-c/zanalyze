import { Context, createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod, VerifyMethodResponse } from '@maxdrellin/xenocline';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { EmlContent } from '@vortiq/eml-parse-js';
import { getLogger } from '../logging';
import * as Prompt from '../prompt/prompts';
import { Config } from '../types';
import * as OpenAI from '../util/openai';
import { CLASSIFY_PHASE_NODE_NAME } from './classify';
import { Input as ClassifyPhaseInput } from './classify';

export const SIMPLIFY_PHASE_NODE_NAME = 'simplify_node';
export const SIMPLIFY_PHASE_NAME = 'simplify';
export const TO_CLASSIFY_CONNECTION_NAME = 'toClassify';
// The locate phase might get the whole context, but, from a type perspective, it only needs the file
export interface Input extends PhaseInput {
    eml: EmlContent;
}

// The locate phase creates the creationTime, outputPath, and hash
export interface Output extends PhaseOutput {
    eml: EmlContent;
}

export type SimplifyPhase = Phase<Input, Output>;
export type SimplifyPhaseNode = PhaseNode<Input, Output>;

export const create = async (config: Config): Promise<SimplifyPhaseNode> => {
    const logger = getLogger();

    const verify = async (input: Input): Promise<VerifyMethodResponse> => {
        const response: VerifyMethodResponse = {
            verified: true,
            messages: [],
        };

        if (!input.eml) {
            logger.error('eml is required for simplify function');
            response.verified = false;
            response.messages.push('eml is required for simplify function');
        }

        return response;
    }

    const execute = async (input: Input): Promise<Output> => {
        let eml = input.eml;
        const simplify = config.simplify;
        const headerPatterns = simplify?.headers?.map(pattern => new RegExp(pattern, 'i')) ?? [];

        if (headerPatterns.length > 0) {
            const filteredHeaderNames = Object.keys(eml.headers).filter((headerName: string) => {
                logger.silly('Checking header name %s', headerName);
                return headerPatterns.some((pattern: RegExp) => {
                    const match = pattern.test(headerName);
                    if (match) {
                        logger.silly('\tKeeping Header: %s: %s', headerName, pattern);
                    }
                    return match;
                });
            });

            logger.silly('Filtered header names %s', filteredHeaderNames);

            const filteredHeaders = filteredHeaderNames.reduce((acc, headerName) => {
                acc[headerName] = eml.headers[headerName];
                return acc;
            }, {} as Record<string, string>);

            eml = {
                ...eml,
                headers: filteredHeaders,
            }
        }

        // --- HTML to Text Conversion ---
        if (!eml.text && eml.html) {
            logger.debug('No text found in EML, converting HTML to text using OpenAI');
            const prompts = await Prompt.create(config.model as Chat.Model, config);
            const html2textPrompt = await prompts.createHtml2TextPrompt(eml.html);
            const formatter = Formatter.create({ logger });
            const chatRequest: Chat.Request = formatter.formatPrompt(config.model as Chat.Model, html2textPrompt);
            const textResult = await OpenAI.createCompletion(chatRequest.messages as any as import('openai/resources').ChatCompletionMessageParam[]);
            eml = {
                ...eml,
                text: textResult,
            };
        }

        if (simplify?.textOnly) {
            eml = {
                ...eml,
                html: undefined,
                htmlheaders: undefined,
            }
        }

        if (simplify?.skipAttachments) {
            eml.attachments = [];
        }

        return {
            eml,
        };
    }


    const transform = async (output: Output, context: Context): Promise<[ClassifyPhaseInput, Context]> => {
        context = {
            ...context,
            eml: output.eml,
        };

        // TODO: Figure out a better way to handle errors during transformation...
        if (!context.eml) {
            throw new Error('eml is required for filter phase');
        }
        return [
            {
                eml: context.eml as EmlContent,
            },
            context,
        ];
    }

    const phase = createPhase(SIMPLIFY_PHASE_NAME, { execute, verify });
    const connection = createConnection(TO_CLASSIFY_CONNECTION_NAME, CLASSIFY_PHASE_NODE_NAME, { transform });

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    return createPhaseNode(SIMPLIFY_PHASE_NODE_NAME, phase, {
        next: [connection],
        process,
    });
}


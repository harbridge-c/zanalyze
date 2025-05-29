import * as xenocline from '@maxdrellin/xenocline';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SENTRY_AGGREGATOR_NODE_NAME } from '../../../src/phases/sentry/aggregator';
import { createSentryPhaseNode } from '../../../src/phases/sentry/sentryPhaseFactory';
import * as prompts from '../../../src/prompt/prompts';
import * as openai from '../../../src/util/openai';

// Mock dependencies
vi.mock('@maxdrellin/xenocline', () => ({
    createConnection: vi.fn((name, target, options) => ({ name, target, options })),
    createPhase: vi.fn((name, methods) => ({ name, methods })),
    createPhaseNode: vi.fn((name, phase, config) => ({ name, phase, config })),
}));

vi.mock('@riotprompt/riotprompt', () => ({
    Chat: {},
    Formatter: {
        create: vi.fn(() => ({
            formatPrompt: vi.fn((model, prompt) => ({ messages: [{ role: 'user', content: 'test' }] })),
        })),
    },
}));

vi.mock('openai/helpers/zod', () => ({
    zodResponseFormat: vi.fn((schema, name) => ({ type: 'json_object', schema, name })),
}));

// Create a persistent logger mock
const mockLogger = {
    error: vi.fn(),
    debug: vi.fn(),
};

vi.mock('../../../src/logging', () => ({
    getLogger: vi.fn(() => mockLogger),
}));

vi.mock('../../../src/prompt/prompts', () => ({
    create: vi.fn(async () => ({
        testPromptFunction: vi.fn(async (text, headers, classifications) => ({
            messages: [{ role: 'system', content: 'Test prompt' }],
        })),
    })),
}));

vi.mock('../../../src/util/openai', () => ({
    createCompletion: vi.fn(async () => ({
        testOutput: { result: 'test completion' },
    })),
}));

vi.mock('../../../src/util/general', () => ({
    stringifyJSON: vi.fn((obj) => JSON.stringify(obj)),
}));

describe('sentryPhaseFactory', () => {
    const mockConfig = {
        classifyModel: 'gpt-4',
        configDirectory: '/test/config',
        overrides: false,
        model: 'gpt-4',
        debug: false,
    };

    const mockOptions = {
        phaseName: 'testPhase',
        phaseNodeName: 'testPhaseNode',
        outputKey: 'testOutput',
        schema: z.object({ result: z.string() }),
        promptFunctionName: 'testPromptFunction' as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSentryPhaseNode', () => {
        it('should create a phase node with the correct configuration', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            const result = await factory(mockConfig);

            expect(xenocline.createPhase).toHaveBeenCalledWith(
                mockOptions.phaseName,
                expect.objectContaining({
                    execute: expect.any(Function),
                    verify: expect.any(Function),
                })
            );

            expect(xenocline.createPhaseNode).toHaveBeenCalledWith(
                mockOptions.phaseNodeName,
                expect.any(Object),
                expect.objectContaining({
                    next: expect.any(Array),
                })
            );
        });

        it('should create a connection to the summarize phase', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            expect(xenocline.createConnection).toHaveBeenCalledWith(
                'toSummarize',
                SENTRY_AGGREGATOR_NODE_NAME,
                expect.objectContaining({
                    transform: expect.any(Function),
                })
            );
        });
    });

    describe('verify method', () => {
        it('should return verified true when input has both eml and classifications', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const verify = phaseCallArgs.verify;

            const validInput = {
                eml: { text: 'test email' },
                classifications: { type: 'test' },
            };

            const result = await verify(validInput);

            expect(result).toEqual({
                verified: true,
                messages: [],
            });
        });

        it('should return verified false when eml is missing', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const verify = phaseCallArgs.verify;

            const invalidInput = {
                classifications: { type: 'test' },
            };

            const result = await verify(invalidInput);

            expect(result).toEqual({
                verified: false,
                messages: ['eml is required for sentry function'],
            });
        });

        it('should return verified false when classifications is missing', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const verify = phaseCallArgs.verify;

            const invalidInput = {
                eml: { text: 'test email' },
            };

            const result = await verify(invalidInput);

            expect(result).toEqual({
                verified: false,
                messages: ['classifications is required for sentry function'],
            });
        });

        it('should return verified false when both eml and classifications are missing', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const verify = phaseCallArgs.verify;

            const invalidInput = {};

            const result = await verify(invalidInput);

            expect(result).toEqual({
                verified: false,
                messages: [
                    'eml is required for sentry function',
                    'classifications is required for sentry function',
                ],
            });
        });
    });

    describe('execute method', () => {
        it('should call the prompt function with correct parameters', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { text: 'test email text', headers: { from: 'test@test.com' } },
                classifications: { type: 'test' },
            };

            await execute(input);

            const promptsModule = await (prompts.create as any).mock.results[0].value;
            expect(promptsModule.testPromptFunction).toHaveBeenCalledWith(
                'test email text',
                { from: 'test@test.com' },
                { type: 'test' }
            );
        });

        it('should use html when text is not available', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { html: '<p>test email html</p>', headers: { from: 'test@test.com' } },
                classifications: { type: 'test' },
            };

            await execute(input);

            const promptsModule = await (prompts.create as any).mock.results[0].value;
            expect(promptsModule.testPromptFunction).toHaveBeenCalledWith(
                '<p>test email html</p>',
                { from: 'test@test.com' },
                { type: 'test' }
            );
        });

        it('should use empty string when neither text nor html is available', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { headers: { from: 'test@test.com' } },
                classifications: { type: 'test' },
            };

            await execute(input);

            const promptsModule = await (prompts.create as any).mock.results[0].value;
            expect(promptsModule.testPromptFunction).toHaveBeenCalledWith(
                '',
                { from: 'test@test.com' },
                { type: 'test' }
            );
        });

        it('should call OpenAI createCompletion with formatted messages and response format', async () => {
            const { zodResponseFormat } = await import('openai/helpers/zod');
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { text: 'test email' },
                classifications: { type: 'test' },
            };

            await execute(input);

            expect(openai.createCompletion).toHaveBeenCalledWith(
                [{ role: 'user', content: 'test' }],
                expect.objectContaining({
                    model: mockConfig.classifyModel,
                    responseFormat: expect.any(Object),
                })
            );

            expect(zodResponseFormat).toHaveBeenCalledWith(
                expect.objectContaining({ shape: expect.any(Object) }),
                mockOptions.outputKey
            );
        });

        it('should return the completion result', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { text: 'test email' },
                classifications: { type: 'test' },
            };

            const result = await execute(input);

            expect(result).toEqual({
                testOutput: { result: 'test completion' },
            });
        });
    });

    describe('connection transform', () => {
        it('should merge output with context', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const connectionCallArgs = (xenocline.createConnection as any).mock.calls[0][2];
            const transform = connectionCallArgs.transform;

            const output = { result: 'test output' };
            const context = { existingContext: 'test context' };

            const [transformedInput, transformedContext] = await transform(output, context);

            expect(transformedInput).toEqual({
                existingContext: 'test context',
                result: 'test output',
            });

            expect(transformedContext).toEqual({
                existingContext: 'test context',
                result: 'test output',
            });
        });
    });

    describe('error handling', () => {
        it('should log debug message for completion', async () => {
            const factory = createSentryPhaseNode(mockOptions);
            await factory(mockConfig);

            const phaseCallArgs = (xenocline.createPhase as any).mock.calls[0][1];
            const execute = phaseCallArgs.execute;

            const input = {
                eml: { text: 'test email' },
                classifications: { type: 'test' },
            };

            await execute(input);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Sentry Context Completion: \n\n%s\n\n',
                expect.stringContaining('testOutput')
            );
        });
    });
});

import { EmlContent } from '@vortiq/eml-parse-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ClassifyModule from '../../src/phases/classify';

// Mock dependencies
vi.mock('@maxdrellin/xenocline');
vi.mock('@riotprompt/riotprompt');
vi.mock('../../src/logging');
vi.mock('../../src/prompt/prompts');
vi.mock('../../src/util/openai');
vi.mock('../../src/util/general');

// Import mocked modules
import { createConnection, createPhase, createPhaseNode } from '@maxdrellin/xenocline';
import { Formatter } from '@riotprompt/riotprompt';
import { getLogger } from '../../src/logging';
import * as Prompt from '../../src/prompt/prompts';
import { stringifyJSON } from '../../src/util/general';
import * as OpenAI from '../../src/util/openai';

describe('Classify Phase', () => {
    let mockLogger: any;
    let mockConfig: ClassifyModule.Config;
    let mockPrompts: any;
    let mockFormatter: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Setup mock logger
        mockLogger = {
            debug: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
        };
        vi.mocked(getLogger).mockReturnValue(mockLogger);

        // Setup mock config
        mockConfig = {
            classifyModel: 'gpt-4',
            configDirectory: '/test/config',
            overrides: {} as any,
            debug: false,
        };

        // Setup mock prompts
        mockPrompts = {
            createClassificationPrompt: vi.fn(),
        };
        vi.mocked(Prompt.create).mockResolvedValue(mockPrompts);

        // Setup mock formatter
        mockFormatter = {
            formatPrompt: vi.fn(),
        };
        vi.mocked(Formatter.create).mockReturnValue(mockFormatter);

        // Setup stringifyJSON mock
        vi.mocked(stringifyJSON).mockImplementation((obj) => JSON.stringify(obj));

        // Setup createPhase mock
        vi.mocked(createPhase).mockImplementation((...args: any[]) => {
            const [name, methods] = args;
            return {
                name,
                execute: methods.execute,
                verify: methods.verify,
            } as any;
        });

        // Setup createPhaseNode mock
        vi.mocked(createPhaseNode).mockImplementation((...args: any[]) => {
            const [name, phase, options] = args;
            return {
                name,
                phase,
                next: options.next,
                process: options.process,
            } as any;
        });

        // Setup createConnection mock
        vi.mocked(createConnection).mockImplementation((...args: any[]) => {
            const [name, target, options] = args;
            return {
                name,
                target,
                transform: options.transform,
            } as any;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Schemas', () => {
        it('should validate Classification schema correctly', () => {
            const validClassification = {
                coordinate: ['category1', 'subcategory1'],
                strength: 0.95,
                reason: 'High confidence match',
            };

            const result = ClassifyModule.ClassificationSchema.safeParse(validClassification);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validClassification);
            }
        });

        it('should reject invalid Classification schema', () => {
            const invalidClassification = {
                coordinate: 'not-an-array', // Should be array
                strength: 'not-a-number', // Should be number
                reason: 123, // Should be string
            };

            const result = ClassifyModule.ClassificationSchema.safeParse(invalidClassification);
            expect(result.success).toBe(false);
        });

        it('should validate Classifications array schema', () => {
            const validClassifications = [
                {
                    coordinate: ['category1'],
                    strength: 0.8,
                    reason: 'Match 1',
                },
                {
                    coordinate: ['category2', 'sub2'],
                    strength: 0.6,
                    reason: 'Match 2',
                },
            ];

            const result = ClassifyModule.ClassificationsSchema.safeParse(validClassifications);
            expect(result.success).toBe(true);
        });
    });

    describe('create function', () => {
        it('should create a ClassifyPhaseNode successfully', async () => {
            const phaseNode = await ClassifyModule.create(mockConfig);

            expect(phaseNode).toBeDefined();
            expect((phaseNode as any).name).toBe(ClassifyModule.CLASSIFY_PHASE_NODE_NAME);
            expect(phaseNode.phase).toBeDefined();
            expect((phaseNode as any).next).toBeDefined();
            expect((phaseNode as any).process).toBeDefined();

            // Verify prompts were created
            expect(Prompt.create).toHaveBeenCalledWith(mockConfig.classifyModel, mockConfig.configDirectory, mockConfig.overrides, {});

            // Verify phase was created
            expect(createPhase).toHaveBeenCalledWith(
                ClassifyModule.CLASSIFY_PHASE_NAME,
                expect.objectContaining({
                    execute: expect.any(Function),
                    verify: expect.any(Function),
                })
            );

            // Verify connections were created
            expect(createConnection).toHaveBeenCalledTimes(4); // 4 sentry connections
        });
    });

    describe('verify method', () => {
        let verifyMethod: any;

        beforeEach(async () => {
            await ClassifyModule.create(mockConfig);
            const mockCalls = vi.mocked(createPhase).mock.calls;
            const createPhaseCall = mockCalls[0] as any[];
            verifyMethod = createPhaseCall[1].verify;
        });

        it('should pass verification with valid input', async () => {
            const validInput: ClassifyModule.Input = {
                eml: {
                    text: 'Email content',
                    headers: {},
                } as unknown as EmlContent,
            };

            const result = await verifyMethod(validInput);

            expect(result.verified).toBe(true);
            expect(result.messages).toEqual([]);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        it('should fail verification without eml', async () => {
            const invalidInput: any = {};

            const result = await verifyMethod(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('eml is required for classify function');
            expect(mockLogger.error).toHaveBeenCalledWith('eml is required for classify function');
        });
    });

    describe('execute method', () => {
        let executeMethod: any;

        beforeEach(async () => {
            await ClassifyModule.create(mockConfig);
            const mockCalls = vi.mocked(createPhase).mock.calls;
            const createPhaseCall = mockCalls[0] as any[];
            executeMethod = createPhaseCall[1].execute;
        });

        it('should execute classification with text content', async () => {
            const input: ClassifyModule.Input = {
                eml: {
                    text: 'This is the email text content',
                    headers: { from: 'sender@example.com' },
                } as unknown as EmlContent,
            };

            const mockPrompt = { role: 'system', content: 'Classify this email' };
            const mockChatRequest = { messages: [mockPrompt] };
            const mockClassifications = {
                classifications: [
                    {
                        coordinate: ['business', 'invoice'],
                        strength: 0.9,
                        reason: 'Contains invoice keywords',
                    },
                ],
            };

            mockPrompts.createClassificationPrompt.mockResolvedValue(mockPrompt);
            mockFormatter.formatPrompt.mockReturnValue(mockChatRequest);
            vi.mocked(OpenAI.createCompletion).mockResolvedValue(mockClassifications);

            const result = await executeMethod(input);

            expect(result).toEqual(mockClassifications);
            expect(mockPrompts.createClassificationPrompt).toHaveBeenCalledWith(
                'This is the email text content',
                { from: 'sender@example.com' }
            );
            expect(mockFormatter.formatPrompt).toHaveBeenCalledWith(mockConfig.classifyModel, mockPrompt);
            expect(OpenAI.createCompletion).toHaveBeenCalledWith(
                mockChatRequest.messages,
                expect.objectContaining({
                    model: mockConfig.classifyModel,
                    responseFormat: expect.any(Object),
                })
            );
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should execute classification with HTML content when text is not available', async () => {
            const input: ClassifyModule.Input = {
                eml: {
                    html: '<p>This is HTML content</p>',
                    headers: {},
                } as unknown as EmlContent,
            };

            const mockPrompt = { role: 'system', content: 'Classify this email' };
            const mockChatRequest = { messages: [mockPrompt] };
            const mockClassifications = { classifications: [] };

            mockPrompts.createClassificationPrompt.mockResolvedValue(mockPrompt);
            mockFormatter.formatPrompt.mockReturnValue(mockChatRequest);
            vi.mocked(OpenAI.createCompletion).mockResolvedValue(mockClassifications);

            const result = await executeMethod(input);

            expect(result).toEqual(mockClassifications);
            expect(mockPrompts.createClassificationPrompt).toHaveBeenCalledWith(
                '<p>This is HTML content</p>',
                {}
            );
        });

        it('should handle empty content', async () => {
            const input: ClassifyModule.Input = {
                eml: {
                    headers: {},
                } as unknown as EmlContent,
            };

            const mockPrompt = { role: 'system', content: 'Classify this email' };
            const mockChatRequest = { messages: [mockPrompt] };
            const mockClassifications = { classifications: [] };

            mockPrompts.createClassificationPrompt.mockResolvedValue(mockPrompt);
            mockFormatter.formatPrompt.mockReturnValue(mockChatRequest);
            vi.mocked(OpenAI.createCompletion).mockResolvedValue(mockClassifications);

            const result = await executeMethod(input);

            expect(result).toEqual(mockClassifications);
            expect(mockPrompts.createClassificationPrompt).toHaveBeenCalledWith('', {});
        });
    });

    describe('connections and transformations', () => {
        it('should create correct connections to sentry nodes', async () => {
            await ClassifyModule.create(mockConfig);

            expect(createConnection).toHaveBeenCalledWith(
                'toEventSentry',
                'event_sentry_node',
                expect.objectContaining({ transform: expect.any(Function) })
            );
            expect(createConnection).toHaveBeenCalledWith(
                'toPersonSentry',
                'person_sentry_node',
                expect.objectContaining({ transform: expect.any(Function) })
            );
            expect(createConnection).toHaveBeenCalledWith(
                'toReceiptSentry',
                'receipt_sentry_node',
                expect.objectContaining({ transform: expect.any(Function) })
            );
            expect(createConnection).toHaveBeenCalledWith(
                'toBillSentry',
                'bill_sentry_node',
                expect.objectContaining({ transform: expect.any(Function) })
            );
        });

        it('should transform output correctly', async () => {
            await ClassifyModule.create(mockConfig);

            const mockCalls = vi.mocked(createConnection).mock.calls;
            const connectionCall = mockCalls[0] as any[];
            const transformFn = connectionCall[2].transform;

            const output: ClassifyModule.Output = {
                classifications: [
                    {
                        coordinate: ['test'],
                        strength: 0.8,
                        reason: 'test reason',
                    },
                ],
            };

            const context = { someContext: 'value' };

            const [transformedInput, transformedContext] = await transformFn(output, context);

            expect(transformedInput).toEqual({
                ...context,
                ...output,
            });
            expect(transformedContext).toEqual({
                ...context,
                ...output,
            });
        });
    });

    describe('process method', () => {
        let processMethod: any;

        beforeEach(async () => {
            const phaseNode = await ClassifyModule.create(mockConfig);
            processMethod = (phaseNode as any).process;
        });

        it('should process output and context correctly', async () => {
            const output: ClassifyModule.Output = {
                classifications: [
                    {
                        coordinate: ['category'],
                        strength: 0.75,
                        reason: 'Processing test',
                    },
                ],
            };

            const context = { existingData: 'test' };

            const [processedOutput, processedContext] = await processMethod(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                ...context,
                ...output,
            });
        });
    });

    describe('Constants', () => {
        it('should export correct constant values', () => {
            expect(ClassifyModule.CLASSIFY_PHASE_NAME).toBe('classify');
            expect(ClassifyModule.CLASSIFY_PHASE_NODE_NAME).toBe('classify_node');
        });
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmlContent } from '@vortiq/eml-parse-js';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import path from 'path';
import {
    create,
    Config,
    Input,
    Output,
    SUMMARIZE_PHASE_NAME,
    SUMMARIZE_PHASE_NODE_NAME
} from '../../src/phases/summarize';
import { Classifications } from '../../src/phases/classify';
import { Events } from '../../src/phases/sentry/event';
import { People } from '../../src/phases/sentry/person';
import { DEFAULT_CHARACTER_ENCODING } from '../../src/constants';

// Mock dependencies
vi.mock('../../src/logging', () => ({
    getLogger: vi.fn(() => ({
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn()
    }))
}));

vi.mock('../../src/prompt/prompts', () => ({
    create: vi.fn()
}));

vi.mock('../../src/util/storage', () => ({
    create: vi.fn()
}));

vi.mock('../../src/util/openai', () => ({
    createCompletion: vi.fn()
}));

vi.mock('@riotprompt/riotprompt', () => ({
    Formatter: {
        create: vi.fn(() => ({
            formatPrompt: vi.fn()
        }))
    },
    Chat: {
        Model: {}
    }
}));

vi.mock('@maxdrellin/xenocline', () => ({
    createPhase: vi.fn((name, methods) => ({ name, ...methods })),
    createPhaseNode: vi.fn((name, phase, options) => ({
        name,
        phase,
        ...options,
        connect: vi.fn()
    }))
}));

// Import mocked modules
import * as Prompt from '../../src/prompt/prompts';
import * as Storage from '../../src/util/storage';
import * as OpenAI from '../../src/util/openai';
import { Formatter } from '@riotprompt/riotprompt';
import { getLogger } from '../../src/logging';

describe('summarize phase', () => {
    const mockConfig: Config = {
        model: 'gpt-4',
        configDirectory: '/config',
        overrides: false,
        debug: false
    };

    const mockEml = {
        text: 'Test email content',
        html: '<p>Test email content</p>',
        headers: {
            from: 'sender@example.com',
            to: 'recipient@example.com',
            subject: 'Test Subject'
        },
        date: new Date('2024-01-01'),
        subject: 'Test Subject',
        from: [],
        to: []
    } as unknown as EmlContent;

    const mockClassifications: Classifications = [
        {
            coordinate: ['business', 'support'],
            strength: 0.8,
            reason: 'Business support email'
        }
    ];

    const mockEvents: Events = [
        {
            name: 'Team Meeting',
            date: '2024-01-01',
            time: '10:00',
            eventType: 'meeting',
            dateType: 'exact',
            location: 'Conference Room',
            description: 'Weekly team sync',
            category: 'work',
            reason: 'Regular meeting mentioned in email'
        }
    ];

    const mockPeople: People = [
        {
            name: 'John Doe',
            role: 'Team Lead',
            category: 'work',
            reason: 'Mentioned as meeting organizer'
        }
    ];

    const mockInput: Input = {
        eml: mockEml,
        outputPath: '/output',
        hash: 'testhash123',
        filename: 'test.output.json',
        contextPath: '/context',
        classifications: mockClassifications,
        events: mockEvents,
        people: mockPeople
    };

    let mockStorage: any;
    let mockPrompts: any;
    let mockFormatter: any;
    let mockLogger: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockStorage = {
            exists: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn()
        };

        mockPrompts = {
            createSummarizePrompt: vi.fn()
        };

        mockFormatter = {
            formatPrompt: vi.fn()
        };

        mockLogger = {
            debug: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn()
        };

        vi.mocked(Storage.create).mockReturnValue(mockStorage);
        vi.mocked(Prompt.create).mockResolvedValue(mockPrompts);
        vi.mocked(Formatter.create).mockReturnValue(mockFormatter);
        vi.mocked(getLogger).mockReturnValue(mockLogger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('create', () => {
        it('should create a summarize phase node with correct configuration', async () => {
            const node = await create(mockConfig);

            expect(node).toBeDefined();
            expect(node.phase).toBeDefined();
            expect(node.phase.name).toBe(SUMMARIZE_PHASE_NAME);
            expect(node.process).toBeDefined();
        });

        it('should initialize dependencies correctly', async () => {
            await create(mockConfig);

            expect(Prompt.create).toHaveBeenCalledWith(mockConfig.model, mockConfig.configDirectory, mockConfig.overrides, { contextDirectories: mockConfig.contextDirectories });
            expect(Storage.create).toHaveBeenCalledWith({ log: mockLogger.debug });
            expect(getLogger).toHaveBeenCalled();
        });
    });

    describe('execute', () => {
        let node: any;
        let execute: any;

        beforeEach(async () => {
            node = await create(mockConfig);
            execute = node.phase.execute;
        });

        it('should successfully generate and save a summary', async () => {
            const expectedSummary = 'This is a test summary of the email.';
            const mockPrompt = { role: 'system', content: 'Summarize this email' };
            const mockChatRequest = { messages: [mockPrompt] };

            mockStorage.exists.mockResolvedValue(false);
            mockPrompts.createSummarizePrompt.mockResolvedValue(mockPrompt);
            mockFormatter.formatPrompt.mockReturnValue(mockChatRequest);
            vi.mocked(OpenAI.createCompletion).mockResolvedValue({ summary: expectedSummary });

            const result = await execute(mockInput);

            expect(result).toEqual({ summary: expectedSummary });

            // Verify the flow
            expect(mockStorage.exists).toHaveBeenCalledWith(path.join('/output', 'test.summary.md'));
            expect(mockPrompts.createSummarizePrompt).toHaveBeenCalledWith(
                mockEml.text,
                mockEml.headers,
                mockEvents,
                mockPeople,
                mockClassifications
            );
            expect(mockFormatter.formatPrompt).toHaveBeenCalledWith(mockConfig.model, mockPrompt);
            expect(OpenAI.createCompletion).toHaveBeenCalledWith(
                mockChatRequest.messages,
                {
                    responseFormat: zodResponseFormat(z.object({ summary: z.string() }), 'summary'),
                    model: mockConfig.model
                }
            );
            expect(mockStorage.writeFile).toHaveBeenCalledWith(
                path.join('/output', 'test.summary.md'),
                expectedSummary,
                DEFAULT_CHARACTER_ENCODING
            );
        });

        it('should return existing summary if file already exists', async () => {
            const existingSummary = 'Existing summary content';
            mockStorage.exists.mockResolvedValue(true);
            mockStorage.readFile.mockResolvedValue(existingSummary);

            const result = await execute(mockInput);

            expect(result).toEqual({ summary: existingSummary });
            expect(mockStorage.exists).toHaveBeenCalledWith(path.join('/output', 'test.summary.md'));
            expect(mockStorage.readFile).toHaveBeenCalledWith(
                path.join('/output', 'test.summary.md'),
                DEFAULT_CHARACTER_ENCODING
            );

            // Should not call OpenAI or write file
            expect(OpenAI.createCompletion).not.toHaveBeenCalled();
            expect(mockStorage.writeFile).not.toHaveBeenCalled();
        });

        it('should use html content when text is not available', async () => {
            const inputWithoutText = {
                ...mockInput,
                eml: {
                    ...mockEml,
                    text: undefined
                }
            };

            mockStorage.exists.mockResolvedValue(false);
            mockPrompts.createSummarizePrompt.mockResolvedValue({});
            mockFormatter.formatPrompt.mockReturnValue({ messages: [] });
            vi.mocked(OpenAI.createCompletion).mockResolvedValue({ summary: 'Summary from HTML' });

            await execute(inputWithoutText);

            expect(mockPrompts.createSummarizePrompt).toHaveBeenCalledWith(
                mockEml.html,
                mockEml.headers,
                mockEvents,
                mockPeople,
                mockClassifications
            );
        });

        it('should use empty string when both text and html are not available', async () => {
            const inputWithoutContent = {
                ...mockInput,
                eml: {
                    ...mockEml,
                    text: undefined,
                    html: undefined
                }
            };

            mockStorage.exists.mockResolvedValue(false);
            mockPrompts.createSummarizePrompt.mockResolvedValue({});
            mockFormatter.formatPrompt.mockReturnValue({ messages: [] });
            vi.mocked(OpenAI.createCompletion).mockResolvedValue({ summary: 'Summary without content' });

            await execute(inputWithoutContent);

            expect(mockPrompts.createSummarizePrompt).toHaveBeenCalledWith(
                '',
                mockEml.headers,
                mockEvents,
                mockPeople,
                mockClassifications
            );
        });

        describe('error handling', () => {
            it('should throw error when eml is missing', async () => {
                const invalidInput = { ...mockInput, eml: undefined } as any;

                await expect(execute(invalidInput)).rejects.toThrow('eml is required for summarize function');
                expect(mockLogger.error).toHaveBeenCalledWith('eml is required for summarize function');
            });

            it('should throw error when events is missing', async () => {
                const invalidInput = { ...mockInput, events: undefined } as any;

                await expect(execute(invalidInput)).rejects.toThrow('events is required for summarize function');
                expect(mockLogger.error).toHaveBeenCalledWith('events is required for summarize function');
            });

            it('should throw error when people is missing', async () => {
                const invalidInput = { ...mockInput, people: undefined } as any;

                await expect(execute(invalidInput)).rejects.toThrow('people is required for summarize function');
                expect(mockLogger.error).toHaveBeenCalledWith('people is required for summarize function');
            });

            it('should throw error when classifications is missing', async () => {
                const invalidInput = { ...mockInput, classifications: undefined } as any;

                await expect(execute(invalidInput)).rejects.toThrow('classifications is required for summarize function');
                expect(mockLogger.error).toHaveBeenCalledWith('classifications is required for summarize function');
            });
        });

        describe('filename variations', () => {
            it('should handle filename with multiple dots', async () => {
                const inputWithComplexFilename = {
                    ...mockInput,
                    filename: 'test.file.output.json'
                };

                mockStorage.exists.mockResolvedValue(false);
                mockPrompts.createSummarizePrompt.mockResolvedValue({});
                mockFormatter.formatPrompt.mockReturnValue({ messages: [] });
                vi.mocked(OpenAI.createCompletion).mockResolvedValue({ summary: 'Test summary' });

                await execute(inputWithComplexFilename);

                expect(mockStorage.exists).toHaveBeenCalledWith(path.join('/output', 'test.file.summary.md'));
                expect(mockStorage.writeFile).toHaveBeenCalledWith(
                    path.join('/output', 'test.file.summary.md'),
                    'Test summary',
                    DEFAULT_CHARACTER_ENCODING
                );
            });

            it('should handle filename without extension', async () => {
                const inputWithNoExtension = {
                    ...mockInput,
                    filename: 'testoutput'
                };

                mockStorage.exists.mockResolvedValue(false);
                mockPrompts.createSummarizePrompt.mockResolvedValue({});
                mockFormatter.formatPrompt.mockReturnValue({ messages: [] });
                vi.mocked(OpenAI.createCompletion).mockResolvedValue({ summary: 'Test summary' });

                await execute(inputWithNoExtension);

                expect(mockStorage.exists).toHaveBeenCalledWith(path.join('/output', 'testsummary.md'));
            });
        });
    });

    describe('process method', () => {
        it('should merge output with context', async () => {
            const node = await create(mockConfig);
            const processMethod = node.process;

            const output: Output = { summary: 'Test summary' };
            const context = { existingData: 'value' };

            if (processMethod) {
                const [processedOutput, processedContext] = await processMethod(output, context);

                expect(processedOutput).toEqual(output);
                expect(processedContext).toEqual({
                    existingData: 'value',
                    summary: 'Test summary'
                });
            } else {
                throw new Error('Process method should be defined');
            }
        });
    });
});

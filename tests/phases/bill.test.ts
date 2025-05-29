import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { EmlContent } from '@vortiq/eml-parse-js';
import { Chat, Formatter } from '@riotprompt/riotprompt';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { create, Input, Output, Config, BILL_PHASE_NAME, BILL_PHASE_NODE_NAME } from '../../src/phases/bill';
import { Classifications } from '../../src/phases/classify';
import { Events } from '../../src/phases/sentry/event';
import { People } from '../../src/phases/sentry/person';
import { Bills } from '../../src/phases/sentry/bill';
import * as OpenAI from '../../src/util/openai';
import * as Storage from '../../src/util/storage';
import * as Prompt from '../../src/prompt/prompts';
import { getLogger } from '../../src/logging';

// Mock dependencies
vi.mock('../../src/logging');
vi.mock('../../src/util/openai');
vi.mock('../../src/util/storage');
vi.mock('../../src/prompt/prompts');
vi.mock('@riotprompt/riotprompt');

describe('Bill Phase', () => {
    let mockLogger: any;
    let mockStorage: any;
    let mockPrompts: any;
    let mockFormatter: any;
    let config: Config;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock logger
        mockLogger = {
            debug: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn()
        };
        (getLogger as Mock).mockReturnValue(mockLogger);

        // Mock storage
        mockStorage = {
            createDirectory: vi.fn().mockResolvedValue(undefined),
            exists: vi.fn().mockResolvedValue(false),
            readFile: vi.fn(),
            writeFile: vi.fn().mockResolvedValue(undefined)
        };
        (Storage.create as Mock).mockReturnValue(mockStorage);

        // Mock prompts
        mockPrompts = {
            createBillPrompt: vi.fn().mockResolvedValue({
                messages: [{ role: 'user', content: 'Generate bill summary' }]
            })
        };
        (Prompt.create as Mock).mockResolvedValue(mockPrompts);

        // Mock formatter
        mockFormatter = {
            formatPrompt: vi.fn().mockReturnValue({
                messages: [{ role: 'user', content: 'Generate bill summary' }]
            })
        };
        (Formatter.create as Mock).mockReturnValue(mockFormatter);

        // Mock OpenAI
        (OpenAI.createCompletion as Mock).mockResolvedValue({
            bill: 'Generated bill summary content'
        });

        config = {
            configDirectory: '/config',
            overrides: {} as any,
            model: 'gpt-4' as Chat.Model,
            debug: false
        };
    });

    const createValidInput = (): Input => ({
        eml: {
            text: 'Email text content',
            html: '<p>Email HTML content</p>',
            headers: {
                from: 'sender@example.com',
                to: 'recipient@example.com',
                subject: 'Test email'
            },
            date: new Date('2024-01-01'),
            subject: 'Test email',
            from: [{ address: 'sender@example.com', name: 'Sender' }],
            to: [{ address: 'recipient@example.com', name: 'Recipient' }]
        } as unknown as EmlContent,
        outputPath: '/output',
        filename: 'test-email.output.json',
        classifications: [
            {
                coordinate: ['bill', 'utility'],
                strength: 0.95,
                reason: 'This is a utility bill'
            }
        ] as Classifications,
        events: [
            {
                name: 'Event 1',
                date: '2024-01-01',
                time: '10:00',
                eventType: 'deadline' as const,
                dateType: 'exact' as const,
                location: 'Office',
                description: 'Project deadline',
                category: 'work',
                reason: 'Important project milestone'
            }
        ] as Events,
        people: [
            {
                name: 'Person 1',
                role: 'Manager',
                category: 'work' as const,
                reason: 'Project manager'
            }
        ] as People,
        bills: [
            {
                provider: 'Electric Company',
                kind: 'utility' as const,
                amount_due: 100,
                due_date: '2024-01-15',
                period: 'January 2024',
                status: 'due' as const,
                description: 'Monthly electricity bill',
                reason: 'Regular monthly charge'
            }
        ] as Bills
    });

    describe('create', () => {
        it('should create a bill phase node with correct name', async () => {
            const node = await create(config);

            expect(node).toBeDefined();
            expect(node.phase.name).toBe(BILL_PHASE_NAME);
            // PhaseNode extends Node which has id property
            expect(node.id).toBe(BILL_PHASE_NODE_NAME);
        });
    });

    describe('verify', () => {
        it('should verify valid input', async () => {
            const node = await create(config);
            const input = createValidInput();

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(true);
            expect(result.messages).toHaveLength(0);
        });

        it('should fail verification when eml is missing', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input as any).eml;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('eml is required for bill function');
            expect(mockLogger.error).toHaveBeenCalledWith('eml is required for bill function');
        });

        it('should fail verification when events is missing', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input as any).events;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('events is required for bill function');
            expect(mockLogger.error).toHaveBeenCalledWith('events is required for bill function');
        });

        it('should fail verification when people is missing', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input as any).people;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('people is required for bill function');
            expect(mockLogger.error).toHaveBeenCalledWith('people is required for bill function');
        });

        it('should fail verification when classifications is missing', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input as any).classifications;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('classifications is required for bill function');
            expect(mockLogger.error).toHaveBeenCalledWith('classifications is required for bill function');
        });

        it('should fail verification when bills is missing', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input as any).bills;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('bills is required for bill function');
            expect(mockLogger.error).toHaveBeenCalledWith('bills is required for bill function');
        });

        it('should fail verification with multiple missing fields', async () => {
            const node = await create(config);
            const input = { outputPath: '/output', filename: 'test.json' } as Input;

            const result = await node.phase.verify!(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toHaveLength(5);
            expect(result.messages).toContain('eml is required for bill function');
            expect(result.messages).toContain('events is required for bill function');
            expect(result.messages).toContain('people is required for bill function');
            expect(result.messages).toContain('classifications is required for bill function');
            expect(result.messages).toContain('bills is required for bill function');
        });
    });

    describe('execute', () => {
        it('should generate and save bill summary successfully', async () => {
            const node = await create(config);
            const input = createValidInput();
            const expectedBillContent = 'Generated bill summary content';

            const result = await node.phase.execute(input);

            // Verify directory creation
            expect(mockStorage.createDirectory).toHaveBeenCalledWith('/output/bills');

            // Verify file existence check
            expect(mockStorage.exists).toHaveBeenCalledWith('/output/bills/test-email.bill.md');

            // Verify prompt creation
            expect(mockPrompts.createBillPrompt).toHaveBeenCalledWith(
                'Email text content',
                input.eml.headers,
                input.events,
                input.people,
                input.classifications,
                input.bills
            );

            // Verify OpenAI call
            expect(OpenAI.createCompletion).toHaveBeenCalledWith(
                [{ role: 'user', content: 'Generate bill summary' }],
                {
                    responseFormat: zodResponseFormat(z.object({ bill: z.string() }), 'bill'),
                    model: config.model
                }
            );

            // Verify file write
            expect(mockStorage.writeFile).toHaveBeenCalledWith(
                '/output/bills/test-email.bill.md',
                expectedBillContent,
                'utf-8'
            );

            // Verify result
            expect(result).toEqual({ bill: expectedBillContent });
        });

        it('should use HTML content when text is not available', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input.eml as any).text;

            await node.phase.execute(input);

            expect(mockPrompts.createBillPrompt).toHaveBeenCalledWith(
                '<p>Email HTML content</p>',
                input.eml.headers,
                input.events,
                input.people,
                input.classifications,
                input.bills
            );
        });

        it('should use empty string when both text and HTML are not available', async () => {
            const node = await create(config);
            const input = createValidInput();
            delete (input.eml as any).text;
            delete (input.eml as any).html;

            await node.phase.execute(input);

            expect(mockPrompts.createBillPrompt).toHaveBeenCalledWith(
                '',
                input.eml.headers,
                input.events,
                input.people,
                input.classifications,
                input.bills
            );
        });

        it('should skip generation and return existing bill if file already exists', async () => {
            const node = await create(config);
            const input = createValidInput();
            const existingBillContent = 'Existing bill content';

            mockStorage.exists.mockResolvedValue(true);
            mockStorage.readFile.mockResolvedValue(existingBillContent);

            const result = await node.phase.execute(input);

            // Verify file existence check
            expect(mockStorage.exists).toHaveBeenCalledWith('/output/bills/test-email.bill.md');

            // Verify file read
            expect(mockStorage.readFile).toHaveBeenCalledWith('/output/bills/test-email.bill.md', 'utf-8');

            // Verify no OpenAI call was made
            expect(OpenAI.createCompletion).not.toHaveBeenCalled();

            // Verify no file write
            expect(mockStorage.writeFile).not.toHaveBeenCalled();

            // Verify debug log
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Bill file already exists, skipping generation: %s',
                '/output/bills/test-email.bill.md'
            );

            // Verify result
            expect(result).toEqual({ bill: existingBillContent });
        });

        it('should handle different filename patterns correctly', async () => {
            const node = await create(config);
            const testCases = [
                { input: 'email.output.json', expected: 'email.bill.md' },
                { input: 'email.output.eml', expected: 'email.bill.md' },
                { input: 'email.output', expected: 'email.bill.md' },
                { input: 'email.json', expected: 'email.json' } // No 'output' in filename
            ];

            for (const testCase of testCases) {
                const input = createValidInput();
                input.filename = testCase.input;
                mockStorage.exists.mockResolvedValue(false);

                await node.phase.execute(input);

                expect(mockStorage.writeFile).toHaveBeenCalledWith(
                    `/output/bills/${testCase.expected}`,
                    expect.any(String),
                    'utf-8'
                );
            }
        });

        it('should log debug message for completion', async () => {
            const node = await create(config);
            const input = createValidInput();

            await node.phase.execute(input);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Bill Completion: \n\n%s\n\n',
                expect.stringContaining('"bill":"Generated bill summary content"')
            );
        });
    });

    describe('process', () => {
        it('should process output and update context', async () => {
            const node = await create(config);
            const output: Output = { bill: 'Bill summary content' };
            const context = { existingKey: 'existingValue' };

            const [processedOutput, processedContext] = await node.process!(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                existingKey: 'existingValue',
                bill: 'Bill summary content'
            });
        });

        it('should override existing bill in context', async () => {
            const node = await create(config);
            const output: Output = { bill: 'New bill summary' };
            const context = { bill: 'Old bill summary', otherKey: 'value' };

            const [processedOutput, processedContext] = await node.process!(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                otherKey: 'value',
                bill: 'New bill summary'
            });
        });
    });

    describe('error handling', () => {
        it('should propagate errors from storage operations', async () => {
            const node = await create(config);
            const input = createValidInput();
            const error = new Error('Storage error');

            mockStorage.createDirectory.mockRejectedValue(error);

            await expect(node.phase.execute(input)).rejects.toThrow('Storage error');
        });

        it('should propagate errors from OpenAI completion', async () => {
            const node = await create(config);
            const input = createValidInput();
            const error = new Error('OpenAI API error');

            (OpenAI.createCompletion as Mock).mockRejectedValue(error);

            await expect(node.phase.execute(input)).rejects.toThrow('OpenAI API error');
        });

        it('should propagate errors from prompt creation', async () => {
            const node = await create(config);
            const input = createValidInput();
            const error = new Error('Prompt creation error');

            mockPrompts.createBillPrompt.mockRejectedValue(error);

            await expect(node.phase.execute(input)).rejects.toThrow('Prompt creation error');
        });
    });
});

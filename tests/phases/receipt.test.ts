import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmlContent } from '@vortiq/eml-parse-js';
import * as path from 'path';

// Setup mocks before imports
vi.mock('../../src/logging');
vi.mock('../../src/prompt/prompts');
vi.mock('../../src/util/storage');
vi.mock('../../src/util/openai');
vi.mock('@riotprompt/riotprompt');

// Now import the modules
import {
    create,
    Input,
    Output,
    Config,
    RECEIPT_PHASE_NAME,
    RECEIPT_PHASE_NODE_NAME
} from '../../src/phases/receipt';
import { Events } from '../../src/phases/sentry/event';
import { People } from '../../src/phases/sentry/person';
import { Transactions } from '../../src/phases/sentry/receipt';
import { Classifications } from '../../src/phases/classify';
import * as Storage from '../../src/util/storage';
import * as OpenAI from '../../src/util/openai';
import * as Prompt from '../../src/prompt/prompts';
import { getLogger } from '../../src/logging';
import { Formatter } from '@riotprompt/riotprompt';

// Setup mocks after imports
const mockCreateDirectory = vi.fn();
const mockExists = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockCreateReceiptPrompt = vi.fn();
const mockCreateCompletion = vi.fn();
const mockLoggerDebug = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mocked(getLogger).mockReturnValue({
    debug: mockLoggerDebug,
    error: mockLoggerError,
    info: mockLoggerInfo,
    warn: mockLoggerWarn
} as any);

vi.mocked(Storage.create).mockReturnValue({
    createDirectory: mockCreateDirectory,
    exists: mockExists,
    readFile: mockReadFile,
    writeFile: mockWriteFile
} as any);

vi.mocked(Prompt.create).mockResolvedValue({
    createReceiptPrompt: mockCreateReceiptPrompt
} as any);

vi.mocked(OpenAI.createCompletion).mockImplementation(mockCreateCompletion);

vi.mocked(Formatter.create).mockReturnValue({
    formatPrompt: vi.fn(() => ({
        messages: [
            { role: 'system', content: 'Generate a receipt' },
            { role: 'user', content: 'Email content' }
        ]
    }))
} as any);

describe('Receipt Phase', () => {
    const mockConfig: Config = {
        model: 'gpt-4',
        configDirectory: '/config',
        overrides: {} as any,
        debug: false
    };

    const mockEml = {
        headers: {
            from: 'sender@example.com',
            to: 'recipient@example.com',
            subject: 'Test Email'
        },
        text: 'Email body text',
        html: '<p>Email body html</p>',
        date: new Date(),
        subject: 'Test Email',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' }
    } as unknown as EmlContent;

    const mockClassifications: Classifications = [
        {
            coordinate: ['transaction', 'receipt'],
            strength: 0.9,
            reason: 'Contains transaction details'
        }
    ];

    const mockEvents: Events = [
        {
            name: 'Purchase Event',
            date: '2024-01-15',
            time: '14:30',
            eventType: 'other',
            dateType: 'exact',
            location: 'Online',
            description: 'Purchase event',
            category: 'shopping',
            reason: 'Customer purchase'
        }
    ];

    const mockPeople: People = [
        {
            name: 'John Doe',
            role: 'customer',
            category: 'other',
            reason: 'Primary customer'
        }
    ];

    const mockTransactions: Transactions = [
        {
            date: '2024-01-15',
            amount: 100.00,
            description: 'Test transaction',
            type: 'order',
            category: 'other',
            status: 'completed',
            due_date: '',
            merchant_organization: 'Test Store',
            merchant_type: 'other',
            reason: 'Purchase transaction'
        }
    ];

    const mockInput: Input = {
        eml: mockEml,
        outputPath: '/output',
        filename: 'test.output.json',
        classifications: mockClassifications,
        events: mockEvents,
        people: mockPeople,
        transactions: mockTransactions
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset mock return values
        mockExists.mockResolvedValue(false);
        mockCreateDirectory.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue('existing receipt content');
        mockCreateCompletion.mockResolvedValue({
            receipt: 'Generated receipt content'
        });
        mockCreateReceiptPrompt.mockResolvedValue({
            messages: [
                { role: 'system', content: 'Generate a receipt' },
                { role: 'user', content: 'Email content' }
            ]
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a receipt phase node with correct name', async () => {
            const phaseNode = await create(mockConfig);

            expect(phaseNode).toBeDefined();
            expect(phaseNode.phase.name).toBe(RECEIPT_PHASE_NAME);
            expect(phaseNode.id).toBe(RECEIPT_PHASE_NODE_NAME);
        });

        it('should have verify and execute methods', async () => {
            const phaseNode = await create(mockConfig);

            expect(phaseNode.phase.verify).toBeDefined();
            expect(phaseNode.phase.execute).toBeDefined();
            expect(phaseNode.process).toBeDefined();
        });
    });

    describe('verify', () => {
        it('should verify valid input', async () => {
            const phaseNode = await create(mockConfig);
            const result = await phaseNode.phase.verify!(mockInput);

            expect(result.verified).toBe(true);
            expect(result.messages).toHaveLength(0);
        });

        it('should fail verification when eml is missing', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = { ...mockInput, eml: undefined } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('eml is required for receipt function');
            expect(mockLoggerError).toHaveBeenCalledWith('eml is required for receipt function');
        });

        it('should fail verification when events is missing', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = { ...mockInput, events: undefined } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('events is required for receipt function');
        });

        it('should fail verification when people is missing', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = { ...mockInput, people: undefined } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('people is required for receipt function');
        });

        it('should fail verification when classifications is missing', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = { ...mockInput, classifications: undefined } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('classifications is required for receipt function');
        });

        it('should fail verification when transactions is missing', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = { ...mockInput, transactions: undefined } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('transactions is required for receipt function');
        });

        it('should fail verification with multiple missing fields', async () => {
            const phaseNode = await create(mockConfig);
            const invalidInput = {
                ...mockInput,
                eml: undefined,
                events: undefined,
                people: undefined
            } as any;

            const result = await phaseNode.phase.verify!(invalidInput);

            expect(result.verified).toBe(false);
            expect(result.messages).toHaveLength(3);
            expect(result.messages).toContain('eml is required for receipt function');
            expect(result.messages).toContain('events is required for receipt function');
            expect(result.messages).toContain('people is required for receipt function');
        });
    });

    describe('execute', () => {
        it('should generate and save a new receipt', async () => {
            const phaseNode = await create(mockConfig);
            const result = await phaseNode.phase.execute!(mockInput);

            // Verify directory creation
            expect(mockCreateDirectory).toHaveBeenCalledWith(
                path.join(mockInput.outputPath, 'receipts')
            );

            // Verify file existence check
            const expectedReceiptPath = path.join(
                mockInput.outputPath,
                'receipts',
                'test.receipt.md'
            );
            expect(mockExists).toHaveBeenCalledWith(expectedReceiptPath);

            // Verify prompt creation
            expect(mockCreateReceiptPrompt).toHaveBeenCalledWith(
                mockEml.text,
                mockEml.headers,
                mockEvents,
                mockPeople,
                mockClassifications,
                mockTransactions
            );

            // Verify OpenAI call
            expect(mockCreateCompletion).toHaveBeenCalled();

            // Verify file write
            expect(mockWriteFile).toHaveBeenCalledWith(
                expectedReceiptPath,
                'Generated receipt content',
                'utf-8'
            );

            // Verify result
            expect(result).toEqual({
                receipt: 'Generated receipt content'
            });
        });

        it('should return existing receipt if file already exists', async () => {
            mockExists.mockResolvedValueOnce(true);

            const phaseNode = await create(mockConfig);
            const result = await phaseNode.phase.execute!(mockInput);

            // Should still create directory
            expect(mockCreateDirectory).toHaveBeenCalled();

            // Should check if file exists
            expect(mockExists).toHaveBeenCalled();

            // Should read existing file
            expect(mockReadFile).toHaveBeenCalledWith(
                path.join(mockInput.outputPath, 'receipts', 'test.receipt.md'),
                'utf-8'
            );

            // Should not create new prompt or call OpenAI
            expect(mockCreateReceiptPrompt).not.toHaveBeenCalled();
            expect(mockCreateCompletion).not.toHaveBeenCalled();
            expect(mockWriteFile).not.toHaveBeenCalled();

            // Should return existing content
            expect(result).toEqual({
                receipt: 'existing receipt content'
            });
        });

        it('should use HTML content when text is not available', async () => {
            const emlWithoutText = {
                ...mockEml,
                text: undefined
            } as unknown as EmlContent;
            const inputWithHtmlOnly = {
                ...mockInput,
                eml: emlWithoutText
            };

            const phaseNode = await create(mockConfig);
            await phaseNode.phase.execute!(inputWithHtmlOnly);

            expect(mockCreateReceiptPrompt).toHaveBeenCalledWith(
                emlWithoutText.html,
                emlWithoutText.headers,
                mockEvents,
                mockPeople,
                mockClassifications,
                mockTransactions
            );
        });

        it('should use empty string when neither text nor HTML is available', async () => {
            const emlWithoutContent = {
                ...mockEml,
                headers: mockEml.headers,
                text: undefined,
                html: undefined
            } as unknown as EmlContent;
            const inputWithoutContent = {
                ...mockInput,
                eml: emlWithoutContent
            };

            const phaseNode = await create(mockConfig);
            await phaseNode.phase.execute!(inputWithoutContent);

            expect(mockCreateReceiptPrompt).toHaveBeenCalledWith(
                '',
                emlWithoutContent.headers,
                mockEvents,
                mockPeople,
                mockClassifications,
                mockTransactions
            );
        });

        it('should handle different filename patterns correctly', async () => {
            const testCases = [
                { input: 'test.output.json', expected: 'test.receipt.md' },
                { input: 'file.output.txt', expected: 'file.receipt.md' },
                { input: 'noextension.output', expected: 'noextension.receipt.md' },
                { input: 'multiple.dots.output.json', expected: 'multiple.dots.receipt.md' }
            ];

            for (const testCase of testCases) {
                vi.clearAllMocks();
                mockExists.mockResolvedValueOnce(false);

                const input = { ...mockInput, filename: testCase.input };
                const phaseNode = await create(mockConfig);
                await phaseNode.phase.execute!(input);

                const expectedPath = path.join(
                    mockInput.outputPath,
                    'receipts',
                    testCase.expected
                );

                expect(mockWriteFile).toHaveBeenCalledWith(
                    expectedPath,
                    'Generated receipt content',
                    'utf-8'
                );
            }
        });
    });

    describe('process', () => {
        it('should merge output with context', async () => {
            const phaseNode = await create(mockConfig);
            const output: Output = { receipt: 'Test receipt content' };
            const context = { existingKey: 'existingValue' };

            const [processedOutput, processedContext] = await phaseNode.process!(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                existingKey: 'existingValue',
                receipt: 'Test receipt content'
            });
        });

        it('should override context values with output values', async () => {
            const phaseNode = await create(mockConfig);
            const output: Output = { receipt: 'New receipt' };
            const context = { receipt: 'Old receipt', otherKey: 'value' };

            const [processedOutput, processedContext] = await phaseNode.process!(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                otherKey: 'value',
                receipt: 'New receipt'
            });
        });
    });
});

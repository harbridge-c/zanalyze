import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Context } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { create, Input, Output, SIMPLIFY_PHASE_NODE_NAME, SIMPLIFY_PHASE_NAME, TO_CLASSIFY_CONNECTION_NAME } from '../../src/phases/simplify';
import { CLASSIFY_PHASE_NODE_NAME } from '../../src/phases/classify';
import { Config } from '../../src/types';
import * as OpenAI from '../../src/util/openai';
import * as Prompt from '../../src/prompt/prompts';
import { getLogger } from '../../src/logging';

// Mock dependencies
vi.mock('../../src/logging');
vi.mock('../../src/util/openai');
vi.mock('../../src/prompt/prompts');
vi.mock('../../src/phases/classify', () => ({
    CLASSIFY_PHASE_NODE_NAME: 'classify_node'
}));
vi.mock('@riotprompt/riotprompt', () => ({
    Formatter: {
        create: vi.fn(() => ({
            formatPrompt: vi.fn((model, prompt) => ({
                messages: [{ role: 'user', content: prompt }]
            }))
        }))
    }
}));

describe('simplify phase', () => {
    let mockLogger: any;
    let mockConfig: Config;

    beforeEach(() => {
        vi.clearAllMocks();

        mockLogger = {
            debug: vi.fn(),
            error: vi.fn(),
            silly: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
        };
        (getLogger as Mock).mockReturnValue(mockLogger);

        // Create a proper mock config with all required properties
        mockConfig = {
            dryRun: false,
            verbose: false,
            debug: false,
            silly: false,
            model: 'gpt-4',
            classifyModel: 'gpt-4o-mini',
            overrides: false,
            replace: false,
            simplify: {
                headers: [],
                textOnly: false,
                skipAttachments: false,
            },
            inputDirectory: '/tmp/input',
            outputDirectory: '/tmp/output',
            timezone: 'UTC',
            extensions: ['.eml'],
            inputStructure: 'year',
            outputStructure: 'year'
        } as unknown as Config;
    });

    describe('verify', () => {
        it('should verify valid input with eml', async () => {
            const phaseNode = await create(mockConfig);
            const input: Input = {
                eml: {
                    headers: { From: 'test@example.com' },
                    text: 'Test email'
                } as unknown as EmlContent
            };

            const result = await phaseNode.phase?.verify?.(input);

            expect(result?.verified).toBe(true);
            expect(result?.messages).toEqual([]);
        });

        it('should fail verification when eml is missing', async () => {
            const phaseNode = await create(mockConfig);
            const input = {} as Input;

            const result = await phaseNode.phase?.verify?.(input);

            expect(result?.verified).toBe(false);
            expect(result?.messages).toContain('eml is required for simplify function');
            expect(mockLogger.error).toHaveBeenCalledWith('eml is required for simplify function');
        });
    });

    describe('execute', () => {
        describe('header filtering', () => {
            it('should filter headers based on patterns', async () => {
                mockConfig.simplify!.headers = ['^From$', '^To$', '^Subject$'];
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {
                            'From': 'sender@example.com',
                            'To': 'recipient@example.com',
                            'Subject': 'Test',
                            'X-Custom-Header': 'Should be removed',
                            'Content-Type': 'text/plain',
                        },
                        text: 'Test email'
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.headers).toEqual({
                    'From': 'sender@example.com',
                    'To': 'recipient@example.com',
                    'Subject': 'Test',
                });
                expect(result.eml.headers['X-Custom-Header']).toBeUndefined();
                expect(result.eml.headers['Content-Type']).toBeUndefined();
            });

            it('should keep all headers when no patterns are specified', async () => {
                mockConfig.simplify!.headers = [];
                const phaseNode = await create(mockConfig);

                const originalHeaders = {
                    'From': 'sender@example.com',
                    'X-Custom': 'value',
                };

                const input: Input = {
                    eml: {
                        headers: originalHeaders,
                        text: 'Test email'
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.headers).toEqual(originalHeaders);
            });

            it('should handle case-insensitive header patterns', async () => {
                mockConfig.simplify!.headers = ['from', 'to'];
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {
                            'FROM': 'sender@example.com',
                            'To': 'recipient@example.com',
                            'Subject': 'Test',
                        },
                        text: 'Test email'
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.headers).toEqual({
                    'FROM': 'sender@example.com',
                    'To': 'recipient@example.com',
                });
            });
        });

        describe('HTML to text conversion', () => {
            it('should convert HTML to text when text is missing', async () => {
                const mockPrompts = {
                    createHtml2TextPrompt: vi.fn().mockResolvedValue('formatted prompt')
                };
                (Prompt.create as Mock).mockResolvedValue(mockPrompts);
                (OpenAI.createCompletion as Mock).mockResolvedValue('Converted text from HTML');

                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {},
                        html: '<p>HTML content</p>',
                        // text is undefined
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(mockPrompts.createHtml2TextPrompt).toHaveBeenCalledWith('<p>HTML content</p>');
                expect(OpenAI.createCompletion).toHaveBeenCalled();
                expect(result.eml.text).toBe('Converted text from HTML');
                expect(mockLogger.debug).toHaveBeenCalledWith('No text found in EML, converting HTML to text using OpenAI');
            });

            it('should not convert HTML when text is already present', async () => {
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {},
                        text: 'Existing text',
                        html: '<p>HTML content</p>',
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(OpenAI.createCompletion).not.toHaveBeenCalled();
                expect(result.eml.text).toBe('Existing text');
            });
        });

        describe('textOnly option', () => {
            it('should remove HTML when textOnly is true', async () => {
                mockConfig.simplify!.textOnly = true;
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {},
                        text: 'Text content',
                        html: '<p>HTML content</p>',
                        htmlheaders: { 'Content-Type': 'text/html' },
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.html).toBeUndefined();
                expect(result.eml.htmlheaders).toBeUndefined();
                expect(result.eml.text).toBe('Text content');
            });

            it('should keep HTML when textOnly is false', async () => {
                mockConfig.simplify!.textOnly = false;
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {},
                        text: 'Text content',
                        html: '<p>HTML content</p>',
                        htmlheaders: { 'Content-Type': 'text/html' },
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.html).toBe('<p>HTML content</p>');
                expect(result.eml.htmlheaders).toEqual({ 'Content-Type': 'text/html' });
            });
        });

        describe('skipAttachments option', () => {
            it('should remove attachments when skipAttachments is true', async () => {
                mockConfig.simplify!.skipAttachments = true;
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {},
                        text: 'Text content',
                        attachments: [
                            { filename: 'test.pdf', content: 'base64content' }
                        ],
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.attachments).toEqual([]);
            });

            it('should keep attachments when skipAttachments is false', async () => {
                mockConfig.simplify!.skipAttachments = false;
                const phaseNode = await create(mockConfig);

                const attachments = [{ filename: 'test.pdf', content: 'base64content' }];
                const input: Input = {
                    eml: {
                        headers: {},
                        text: 'Text content',
                        attachments,
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.attachments).toEqual(attachments);
            });
        });

        describe('combined options', () => {
            it('should apply all simplification options together', async () => {
                mockConfig.simplify = {
                    headers: ['^From$', '^To$'],
                    textOnly: true,
                    skipAttachments: true,
                };
                const phaseNode = await create(mockConfig);

                const input: Input = {
                    eml: {
                        headers: {
                            'From': 'sender@example.com',
                            'To': 'recipient@example.com',
                            'X-Custom': 'should be removed',
                        },
                        text: 'Text content',
                        html: '<p>HTML content</p>',
                        attachments: [{ filename: 'test.pdf' }],
                    } as unknown as EmlContent
                };

                const result = await phaseNode.phase.execute(input);

                expect(result.eml.headers).toEqual({
                    'From': 'sender@example.com',
                    'To': 'recipient@example.com',
                });
                expect(result.eml.html).toBeUndefined();
                expect(result.eml.attachments).toEqual([]);
            });
        });
    });

    describe('transform', () => {
        it('should transform output to classify phase input', async () => {
            const phaseNode = await create(mockConfig);
            const output: Output = {
                eml: {
                    headers: { From: 'test@example.com' },
                    text: 'Test email'
                } as unknown as EmlContent
            };
            const context: Context = {};

            const connections = phaseNode.next as unknown as any[];
            expect(connections).toBeDefined();
            expect(connections).toHaveLength(1);
            const [classifyInput, newContext] = await connections[0].transform!(output, context);

            expect(classifyInput).toEqual({
                eml: output.eml
            });
            expect(newContext).toEqual({
                eml: output.eml
            });
        });

        it('should throw error when eml is not in context', async () => {
            const phaseNode = await create(mockConfig);
            const output: Output = {} as Output;
            const context: Context = {};

            const connections = phaseNode.next as unknown as any[];
            expect(connections).toBeDefined();
            expect(connections).toHaveLength(1);
            await expect(connections[0].transform!(output, context))
                .rejects.toThrow('eml is required for filter phase');
        });
    });

    describe('process', () => {
        it('should merge output with context', async () => {
            const phaseNode = await create(mockConfig);
            const output: Output = {
                eml: {
                    headers: { From: 'test@example.com' },
                    text: 'Test email'
                } as unknown as EmlContent
            };
            const context: Context = {
                someExistingData: 'value'
            };

            const [processedOutput, processedContext] = await phaseNode.process!(output, context);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                someExistingData: 'value',
                eml: output.eml
            });
        });
    });

    describe('phase node creation', () => {
        it('should create phase node with correct name and connections', async () => {
            const phaseNode = await create(mockConfig);

            expect(phaseNode.id).toBe(SIMPLIFY_PHASE_NODE_NAME);
            expect(phaseNode.phase.name).toBe(SIMPLIFY_PHASE_NAME);
            expect(phaseNode.next).toBeDefined();
            const connections = phaseNode.next as unknown as any[];
            expect(connections).toHaveLength(1);
            expect(connections[0].id).toBe(TO_CLASSIFY_CONNECTION_NAME);
            expect(connections[0].targetNodeId).toBe(CLASSIFY_PHASE_NODE_NAME);
        });
    });
});

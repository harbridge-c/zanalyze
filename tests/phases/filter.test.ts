import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailAddress, EmlContent } from '@vortiq/eml-parse-js';
import { Context } from '@maxdrellin/xenocline';
import { create, Config, Input, Output, FILTER_PHASE_NODE_NAME } from '../../src/phases/filter';
import { SIMPLIFY_PHASE_NODE_NAME } from '../../src/phases/simplify';

// Mock the logger
vi.mock('../../src/logging', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        verbose: vi.fn(),
        error: vi.fn(),
    }),
}));

describe('Filter Phase', () => {
    let filterNode: any;
    let mockEml: EmlContent;
    let mockContext: Context;

    beforeEach(() => {
        mockEml = {
            subject: 'Test Subject',
            to: [
                { name: 'John Doe', email: 'john@example.com' },
                { name: 'Jane Doe', email: 'jane@example.com' },
            ] as EmailAddress[],
            from: [
                { name: 'Sender Name', email: 'sender@example.com' },
            ] as EmailAddress[],
        } as EmlContent;

        mockContext = {
            eml: mockEml,
            outputPath: '/output/path',
            hash: 'test-hash',
            filename: 'test.eml',
            contextPath: '/context/path',
        };
    });

    describe('create', () => {
        it('should create a filter phase node with correct name', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);

            expect(filterNode.id).toBe(FILTER_PHASE_NODE_NAME);
            expect(filterNode.phase).toBeDefined();
            expect(filterNode.next).toBeDefined();
            expect(filterNode.process).toBeDefined();
        });
    });

    describe('verify', () => {
        it('should verify valid input', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const input: Input = { eml: mockEml };

            const result = await filterNode.phase.verify(input);

            expect(result.verified).toBe(true);
            expect(result.messages).toEqual([]);
        });

        it('should fail verification when eml is missing', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const input: Input = { eml: undefined as any };

            const result = await filterNode.phase.verify(input);

            expect(result.verified).toBe(false);
            expect(result.messages).toContain('eml is required for filter function');
        });
    });

    describe('execute', () => {
        describe('without filters', () => {
            it('should include email by default when no filters are configured', async () => {
                const config: Config = { filters: undefined };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toBe('Default Include');
            });
        });

        describe('with include filters', () => {
            it('should exclude by default when include filters are defined', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            subject: ['NonMatchingSubject'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toBe('Default Include set to False since include filters are defined');
            });

            it('should include email when subject matches include filter', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            subject: ['Test.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched subject');
            });

            it('should include email when to email matches include filter', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            to: ['john@example\\.com'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched to email');
            });

            it('should include email when to name matches include filter', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            to: ['John.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched to name');
            });

            it('should include email when from email matches include filter', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            from: ['sender@example\\.com'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched from email');
            });

            it('should include email when from name matches include filter', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            from: ['Sender.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched from name');
            });
        });

        describe('with exclude filters', () => {
            it('should exclude email when subject matches exclude filter', async () => {
                const config: Config = {
                    filters: {
                        exclude: {
                            subject: ['Test.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched subject');
            });

            it('should exclude email when to email matches exclude filter', async () => {
                const config: Config = {
                    filters: {
                        exclude: {
                            to: ['john@example\\.com'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched to email');
            });

            it('should exclude email when to name matches exclude filter', async () => {
                const config: Config = {
                    filters: {
                        exclude: {
                            to: ['John.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched to name');
            });

            it('should exclude email when from email matches exclude filter', async () => {
                const config: Config = {
                    filters: {
                        exclude: {
                            from: ['sender@example\\.com'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched from email');
            });

            it('should exclude email when from name matches exclude filter', async () => {
                const config: Config = {
                    filters: {
                        exclude: {
                            from: ['Sender.*'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched from name');
            });
        });

        describe('with both include and exclude filters', () => {
            it('should exclude email when it matches both include and exclude filters', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            subject: ['Test.*'],
                        },
                        exclude: {
                            from: ['sender@example\\.com'],
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = { eml: mockEml };

                const result = await filterNode.phase.execute(input);

                // Exclude filters take precedence
                expect(result.include).toBe(false);
                expect(result.includeReason).toContain('Exclude filter matched from email');
            });
        });

        describe('case insensitive matching', () => {
            it('should match filters case-insensitively', async () => {
                const config: Config = {
                    filters: {
                        include: {
                            subject: ['test subject'], // lowercase
                        },
                    },
                };
                filterNode = await create(config);
                const input: Input = {
                    eml: { ...mockEml, subject: 'TEST SUBJECT' } // uppercase
                };

                const result = await filterNode.phase.execute(input);

                expect(result.include).toBe(true);
                expect(result.includeReason).toContain('Include filter matched subject');
            });
        });
    });

    describe('transform', () => {
        it('should transform output to SimplifyPhaseInput format', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const output: Output = { include: true, includeReason: 'Test reason' };

            // Get the transform function from the decision
            const decision = filterNode.next[0];
            const connections = await decision.decide(output);
            const connection = Array.isArray(connections) ? connections[0] : null;
            const transform = connection?.transform;

            expect(transform).toBeDefined();

            const [transformedInput, transformedContext] = await transform!(output, mockContext);

            expect(transformedInput).toEqual({
                eml: mockEml,
                outputPath: '/output/path',
                hash: 'test-hash',
                filename: 'test.eml',
                contextPath: '/context/path',
            });

            expect(transformedContext).toEqual({
                ...mockContext,
                include: true,
                includeReason: 'Test reason',
            });
        });
    });

    describe('decide', () => {
        it('should create connection to simplify phase when include is true', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const output: Output = { include: true, includeReason: 'Test reason' };

            const decision = filterNode.next[0];
            const result = await decision.decide(output);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);
            expect(result[0].targetNodeId).toBe(SIMPLIFY_PHASE_NODE_NAME);
            expect(result[0].id).toBe('toClassify');
        });

        it('should create termination when include is false', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const output: Output = { include: false, includeReason: 'Filtered out' };

            const decision = filterNode.next[0];
            const result = await decision.decide(output);

            expect(Array.isArray(result)).toBe(false);
            expect(result).toHaveProperty('id', 'filtered');
        });
    });

    describe('process', () => {
        it('should merge output with context', async () => {
            const config: Config = { filters: undefined };
            filterNode = await create(config);
            const output: Output = { include: true, includeReason: 'Test reason' };

            const [processedOutput, processedContext] = await filterNode.process(output, mockContext);

            expect(processedOutput).toEqual(output);
            expect(processedContext).toEqual({
                ...mockContext,
                ...output,
            });
        });
    });

    describe('edge cases', () => {
        it('should handle missing email fields gracefully', async () => {
            const config: Config = {
                filters: {
                    include: {
                        subject: ['Test'],
                        to: ['test@example.com'],
                        from: ['sender@example.com'],
                    },
                },
            };
            filterNode = await create(config);

            // Test with missing fields
            const emlWithMissingFields: EmlContent = {} as EmlContent;
            const input: Input = { eml: emlWithMissingFields };

            const result = await filterNode.phase.execute(input);

            expect(result.include).toBe(false);
            expect(result.includeReason).toBe('Default Include set to False since include filters are defined');
        });

        it('should handle empty filter arrays', async () => {
            const config: Config = {
                filters: {
                    include: {
                        subject: [],
                        to: [],
                        from: [],
                    },
                },
            };
            filterNode = await create(config);
            const input: Input = { eml: mockEml };

            const result = await filterNode.phase.execute(input);

            expect(result.include).toBe(false);
            expect(result.includeReason).toBe('Default Include set to False since include filters are defined');
        });
    });
});

import { describe, expect, it } from 'vitest';
import {
    FiltersSchema,
    SimplifySchema,
    ConfigSchema,
    JobConfigSchema,
    SecureConfigSchema,
    type DateRange,
    type JobArgs,
    type Args,
    type CombinedArgs,
    type Config,
    type JobConfig,
    type SecureConfig,
    type FiltersConfig,
    type SimplifyConfig,
} from '../src/types';

describe('Types and Schemas', () => {
    describe('FiltersSchema', () => {
        it('should parse valid filters with include and exclude', () => {
            const validFilters = {
                include: {
                    subject: ['invoice', 'receipt'],
                    to: ['admin@example.com'],
                    from: ['sender@example.com'],
                },
                exclude: {
                    subject: ['spam', 'newsletter'],
                    to: ['no-reply@example.com'],
                    from: ['spam@example.com'],
                },
            };

            const result = FiltersSchema.parse(validFilters);
            expect(result).toEqual(validFilters);
        });

        it('should parse empty filters object', () => {
            const result = FiltersSchema.parse({});
            expect(result).toEqual({});
        });

        it('should parse filters with only include', () => {
            const validFilters = {
                include: {
                    subject: ['important'],
                },
            };

            const result = FiltersSchema.parse(validFilters);
            expect(result).toEqual(validFilters);
        });

        it('should parse filters with only exclude', () => {
            const validFilters = {
                exclude: {
                    from: ['unwanted@example.com'],
                },
            };

            const result = FiltersSchema.parse(validFilters);
            expect(result).toEqual(validFilters);
        });

        it('should reject invalid filter types', () => {
            const invalidFilters = {
                include: {
                    subject: 'not-an-array', // Should be array
                },
            };

            expect(() => FiltersSchema.parse(invalidFilters)).toThrow();
        });
    });

    describe('SimplifySchema', () => {
        it('should parse valid simplify config', () => {
            const validSimplify = {
                headers: ['Content-Type', 'Subject'],
                textOnly: false,
                skipAttachments: true,
            };

            const result = SimplifySchema.parse(validSimplify);
            expect(result).toEqual(validSimplify);
        });

        it('should apply default values when not provided', () => {
            const result = SimplifySchema.parse({});
            expect(result).toEqual({
                textOnly: true,
                skipAttachments: true,
            });
        });

        it('should parse with only headers', () => {
            const validSimplify = {
                headers: ['Subject', 'From'],
            };

            const result = SimplifySchema.parse(validSimplify);
            expect(result).toEqual({
                headers: ['Subject', 'From'],
                textOnly: true,
                skipAttachments: true,
            });
        });

        it('should reject invalid header types', () => {
            const invalidSimplify = {
                headers: 'not-an-array',
            };

            expect(() => SimplifySchema.parse(invalidSimplify)).toThrow();
        });
    });

    describe('ConfigSchema', () => {
        it('should parse valid config with all fields', () => {
            const validConfig = {
                dryRun: true,
                verbose: true,
                debug: true,
                silly: true,
                model: 'gpt-3.5-turbo',
                classifyModel: 'gpt-3.5-turbo',
                overrides: true,
                contextDirectories: ['/path/to/context'],
                replace: true,
                simplify: {
                    headers: ['Subject'],
                    textOnly: false,
                    skipAttachments: false,
                },
                filters: {
                    include: {
                        subject: ['important'],
                    },
                },
            };

            const result = ConfigSchema.parse(validConfig);
            expect(result).toEqual(validConfig);
        });

        it('should apply all default values when empty object provided', () => {
            const result = ConfigSchema.parse({});
            expect(result).toEqual({
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            });
        });

        it('should parse config with partial fields', () => {
            const partialConfig = {
                dryRun: true,
                model: 'custom-model',
                contextDirectories: ['/path1', '/path2'],
            };

            const result = ConfigSchema.parse(partialConfig);
            expect(result.dryRun).toBe(true);
            expect(result.model).toBe('custom-model');
            expect(result.contextDirectories).toEqual(['/path1', '/path2']);
            expect(result.verbose).toBe(false); // default
            expect(result.debug).toBe(false); // default
        });

        it('should reject invalid boolean types', () => {
            const invalidConfig = {
                dryRun: 'yes', // Should be boolean
            };

            expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
        });

        it('should reject invalid contextDirectories type', () => {
            const invalidConfig = {
                contextDirectories: 'not-an-array',
            };

            expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
        });
    });

    describe('JobConfigSchema', () => {
        it('should parse valid job config', () => {
            const validJobConfig = {
                currentMonth: true,
                start: '2024-01-01',
                end: '2024-12-31',
            };

            const result = JobConfigSchema.parse(validJobConfig);
            expect(result).toEqual(validJobConfig);
        });

        it('should parse empty job config', () => {
            const result = JobConfigSchema.parse({});
            expect(result).toEqual({});
        });

        it('should parse job config with only currentMonth', () => {
            const validJobConfig = {
                currentMonth: false,
            };

            const result = JobConfigSchema.parse(validJobConfig);
            expect(result).toEqual(validJobConfig);
        });

        it('should parse job config with only date range', () => {
            const validJobConfig = {
                start: '2024-01-01',
                end: '2024-01-31',
            };

            const result = JobConfigSchema.parse(validJobConfig);
            expect(result).toEqual(validJobConfig);
        });
    });

    describe('SecureConfigSchema', () => {
        it('should parse secure config with API key', () => {
            const validSecureConfig = {
                openaiApiKey: 'sk-test-key-123',
                dryRun: true,
                model: 'gpt-4',
            };

            const result = SecureConfigSchema.parse(validSecureConfig);
            expect(result).toEqual({
                ...validSecureConfig,
                verbose: false,
                debug: false,
                silly: false,
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            });
        });

        it('should parse secure config without API key', () => {
            const result = SecureConfigSchema.parse({});
            expect(result).toEqual({
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            });
        });

        it('should inherit all ConfigSchema fields', () => {
            const validSecureConfig = {
                openaiApiKey: 'sk-test',
                dryRun: true,
                verbose: true,
                debug: true,
                silly: true,
                model: 'custom-model',
                classifyModel: 'custom-classifier',
                overrides: true,
                contextDirectories: ['/path'],
                replace: true,
                simplify: {
                    textOnly: false,
                    skipAttachments: false,
                },
                filters: {
                    include: {
                        subject: ['test'],
                    },
                },
            };

            const result = SecureConfigSchema.parse(validSecureConfig);
            expect(result).toEqual(validSecureConfig);
        });
    });

    describe('Type inference', () => {
        it('should correctly infer Config type', () => {
            const config: Config = {
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
                timezone: 'UTC',
                configDirectory: '/config',
            };

            const parsed = ConfigSchema.parse({
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            });
            expect(parsed).toMatchObject({
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            });
        });

        it('should correctly infer JobConfig type', () => {
            const jobConfig: JobConfig = {
                currentMonth: true,
                start: '2024-01-01',
                end: '2024-12-31',
            };

            const parsed = JobConfigSchema.parse(jobConfig);
            expect(parsed).toEqual(jobConfig);
        });

        it('should correctly infer SecureConfig type', () => {
            const secureConfig: SecureConfig = {
                openaiApiKey: 'sk-test',
                dryRun: false,
                verbose: false,
                debug: false,
                silly: false,
                model: 'gpt-4o',
                classifyModel: 'gpt-4o-mini',
                overrides: false,
                replace: false,
            };

            const parsed = SecureConfigSchema.parse(secureConfig);
            expect(parsed).toEqual(secureConfig);
        });

        it('should correctly infer FiltersConfig type', () => {
            const filters: FiltersConfig = {
                include: {
                    subject: ['test'],
                    to: ['test@example.com'],
                    from: ['sender@example.com'],
                },
                exclude: {
                    subject: ['spam'],
                },
            };

            const parsed = FiltersSchema.parse(filters);
            expect(parsed).toEqual(filters);
        });

        it('should correctly infer SimplifyConfig type', () => {
            const simplify: SimplifyConfig = {
                headers: ['Subject', 'From'],
                textOnly: true,
                skipAttachments: false,
            };

            const parsed = SimplifySchema.parse(simplify);
            expect(parsed).toEqual(simplify);
        });

        it('should create valid Args interface', () => {
            const args: Args = {
                dryRun: true,
                verbose: true,
                debug: false,
                model: 'gpt-4',
                overrides: false,
                contextDirectories: ['/path'],
                replace: true,
                recursive: true,
                timezone: 'UTC',
                inputDirectory: '/input',
                outputDirectory: '/output',
                extensions: ['.txt', '.md'],
            };

            expect(args.dryRun).toBe(true);
            expect(args.model).toBe('gpt-4');
            expect(args.timezone).toBe('UTC');
        });
    });

    describe('Interface types', () => {
        it('should create valid DateRange interface', () => {
            const dateRange: DateRange = {
                start: new Date('2024-01-01'),
                end: new Date('2024-12-31'),
            };

            expect(dateRange.start).toBeInstanceOf(Date);
            expect(dateRange.end).toBeInstanceOf(Date);
        });

        it('should create valid JobArgs interface', () => {
            const jobArgs: JobArgs = {
                currentMonth: true,
                start: '2024-01-01',
                end: '2024-12-31',
            };

            expect(jobArgs.currentMonth).toBe(true);
            expect(jobArgs.start).toBe('2024-01-01');
            expect(jobArgs.end).toBe('2024-12-31');
        });

        it('should create valid Args interface', () => {
            const args: Args = {
                dryRun: true,
                verbose: true,
                debug: false,
                model: 'gpt-4',
                overrides: false,
                contextDirectories: ['/path'],
                replace: true,
                recursive: true,
                timezone: 'UTC',
                inputDirectory: '/input',
                outputDirectory: '/output',
                extensions: ['.txt', '.md'],
            };

            expect(args.dryRun).toBe(true);
            expect(args.model).toBe('gpt-4');
            expect(args.timezone).toBe('UTC');
        });
    });
});

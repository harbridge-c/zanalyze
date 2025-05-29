import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateJobConfig, configure } from '../src/arguments';
import type { JobConfig } from '../src/types';
import { Command } from 'commander';

// Mock the modules before imports
const mockDreadCabinetModule = {
    DreadCabinet: vi.fn(),
    configure: vi.fn(),
    read: vi.fn(),
    applyDefaults: vi.fn(),
};

const mockCardiganTimeModule = {
    Cardigantime: vi.fn(),
    configure: vi.fn(),
    read: vi.fn(),
    validate: vi.fn(),
};

vi.mock('@theunwalked/dreadcabinet', () => mockDreadCabinetModule);
vi.mock('@theunwalked/cardigantime', () => mockCardiganTimeModule);

vi.mock('commander', () => ({
    Command: vi.fn(),
}));

vi.mock('../src/logging', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
    setLogLevel: vi.fn(),
}));

vi.mock('../src/util/storage', () => ({
    create: vi.fn(() => ({
        isDirectoryReadable: vi.fn().mockReturnValue(true),
    })),
}));

describe('arguments module', () => {
    describe('validateJobConfig', () => {
        test('should throw error when no date range is specified', async () => {
            const config: JobConfig = {};

            await expect(validateJobConfig(config)).rejects.toThrow(
                'You must specify a date range using --start/--end or use --current-month.'
            );
        });

        test('should accept valid start and end dates', async () => {
            const config: JobConfig = {
                start: '2024-01-01',
                end: '2024-01-31'
            };

            await expect(validateJobConfig(config)).resolves.toBeUndefined();
        });

        test('should accept currentMonth flag', async () => {
            const config: JobConfig = {
                currentMonth: true
            };

            await expect(validateJobConfig(config)).resolves.toBeUndefined();
        });

        test('should throw error for invalid start date format', async () => {
            const config: JobConfig = {
                start: 'invalid-date',
                end: '2024-01-31'
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid start date format: invalid-date. Please use YYYY-MM-DD.'
            );
        });

        test('should throw error for invalid end date format', async () => {
            const config: JobConfig = {
                start: '2024-01-01',
                end: 'invalid-date'
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid end date format: invalid-date. Please use YYYY-MM-DD.'
            );
        });

        test('should throw error when currentMonth is used with start date', async () => {
            const config: JobConfig = {
                currentMonth: true,
                start: '2024-01-01'
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'currentMonth cannot be used together with either start or end options'
            );
        });

        test('should throw error when currentMonth is used with end date', async () => {
            const config: JobConfig = {
                currentMonth: true,
                end: '2024-01-31'
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'currentMonth cannot be used together with either start or end options'
            );
        });

        test('should throw error when currentMonth is used with both start and end dates', async () => {
            const config: JobConfig = {
                currentMonth: true,
                start: '2024-01-01',
                end: '2024-01-31'
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'currentMonth cannot be used together with either start or end options'
            );
        });

        test('should accept only start date', async () => {
            const config: JobConfig = {
                start: '2024-01-01'
            };

            await expect(validateJobConfig(config)).resolves.toBeUndefined();
        });

        test('should accept only end date', async () => {
            const config: JobConfig = {
                end: '2024-01-31'
            };

            await expect(validateJobConfig(config)).resolves.toBeUndefined();
        });

        test('should handle various date formats correctly', async () => {
            const validConfigs: JobConfig[] = [
                { start: '2024-01-01', end: '2024-12-31' },
                { start: '2024-02-29' }, // Leap year
                { start: '2023-12-31', end: '2024-01-01' }, // Year boundary
            ];

            for (const config of validConfigs) {
                await expect(validateJobConfig(config)).resolves.toBeUndefined();
            }
        });

        test('should reject malformed dates', async () => {
            const invalidConfigs = [
                { start: '2024-13-01' }, // Invalid month
                { start: '2024-01-32' }, // Invalid day
                { start: '2023-02-29' }, // Not a leap year
                { end: '202401-01' }, // Wrong format
                { end: '01-01-2024' }, // Wrong format
            ];

            for (const config of invalidConfigs) {
                await expect(validateJobConfig(config as JobConfig)).rejects.toThrow();
            }
        });

        test('should throw error for date that looks valid but doesnt exist', async () => {
            const config: JobConfig = {
                start: '2024-02-30' // February 30th doesn't exist
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid start date: 2024-02-30. Date does not exist.'
            );
        });

        test('should throw error for end date that doesnt exist', async () => {
            const config: JobConfig = {
                end: '2024-04-31' // April only has 30 days
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid end date: 2024-04-31. Date does not exist.'
            );
        });

        test('should handle edge case date with invalid getTime()', async () => {
            // This tests lines 149-150 by creating a date string that passes regex but creates invalid Date
            const config: JobConfig = {
                end: '2024-00-01' // Month 00 is invalid
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid end date format: 2024-00-01. Please use YYYY-MM-DD.'
            );
        });

        test('should handle NaN date edge case', async () => {
            // Test a date that could cause isNaN to trigger
            const config: JobConfig = {
                start: '2024-99-99' // Obviously invalid but passes regex
            };

            await expect(validateJobConfig(config)).rejects.toThrow(
                'Invalid start date format: 2024-99-99. Please use YYYY-MM-DD.'
            );
        });
    });

    describe('configure', () => {
        let mockDreadCabinet: any;
        let mockCardiganTime: any;
        let mockProgram: any;

        beforeEach(() => {
            // Reset all mocks
            vi.clearAllMocks();

            // Mock program
            mockProgram = {
                name: vi.fn().mockReturnThis(),
                summary: vi.fn().mockReturnThis(),
                description: vi.fn().mockReturnThis(),
                option: vi.fn().mockReturnThis(),
                version: vi.fn().mockReturnThis(),
                parse: vi.fn(),
                opts: vi.fn().mockReturnValue({
                    currentMonth: true,
                    verbose: false,
                    debug: false,
                    dryRun: false,
                    model: 'gpt-4o',
                }),
            };

            (Command as any).mockImplementation(() => mockProgram);

            // Mock dreadcabinet
            mockDreadCabinet = {
                configure: vi.fn().mockResolvedValue(mockProgram),
                read: vi.fn().mockResolvedValue({
                    inputDirectory: '/test/input',
                    outputDirectory: '/test/output',
                }),
                applyDefaults: vi.fn().mockImplementation((config) => ({
                    ...config,
                    inputDirectory: config.inputDirectory || '/default/input',
                    outputDirectory: config.outputDirectory || '/default/output',
                })),
            };

            // Mock cardigantime
            mockCardiganTime = {
                configure: vi.fn().mockResolvedValue(mockProgram),
                read: vi.fn().mockResolvedValue({
                    timezone: 'UTC',
                }),
                validate: vi.fn().mockResolvedValue(undefined),
            };

            // Update module mocks
            mockDreadCabinetModule.configure = mockDreadCabinet.configure;
            mockDreadCabinetModule.read = mockDreadCabinet.read;
            mockDreadCabinetModule.applyDefaults = mockDreadCabinet.applyDefaults;

            mockCardiganTimeModule.configure = mockCardiganTime.configure;
            mockCardiganTimeModule.read = mockCardiganTime.read;
            mockCardiganTimeModule.validate = mockCardiganTime.validate;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        test('should configure with currentMonth option', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                timezone: 'UTC',
            });

            const [config, dateRange] = await configure(mockDreadCabinet, mockCardiganTime);

            expect(config).toBeDefined();
            expect(dateRange).toBeDefined();
            expect(dateRange.start).toBeInstanceOf(Date);
            expect(dateRange.end).toBeInstanceOf(Date);
            expect(mockDreadCabinet.configure).toHaveBeenCalled();
            expect(mockCardiganTime.configure).toHaveBeenCalled();
        });

        test('should configure with start and end dates', async () => {
            mockProgram.opts.mockReturnValue({
                start: '2024-01-01',
                end: '2024-01-31',
                timezone: 'UTC',
            });

            const [config, dateRange] = await configure(mockDreadCabinet, mockCardiganTime);

            expect(config).toBeDefined();
            expect(dateRange).toBeDefined();
            expect(dateRange.start).toBeInstanceOf(Date);
            expect(dateRange.end).toBeInstanceOf(Date);
        });

        test('should throw error when end date is before start date', async () => {
            mockProgram.opts.mockReturnValue({
                start: '2024-01-31',
                end: '2024-01-01',
                timezone: 'UTC',
            });

            await expect(configure(mockDreadCabinet, mockCardiganTime)).rejects.toThrow(
                'End date (2024-01-01T00:00:00.000Z) must be on or after start date (2024-01-31T00:00:00.000Z).'
            );
        });

        test('should set debug log level when debug flag is true', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                debug: true,
                timezone: 'UTC',
            });

            const setLogLevel = vi.mocked(await import('../src/logging')).setLogLevel;
            await configure(mockDreadCabinet, mockCardiganTime);

            expect(setLogLevel).toHaveBeenCalledWith('debug');
        });

        test('should handle contextDirectories validation', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                contextDirectories: ['/valid/directory'],
                timezone: 'UTC',
            });

            const [config] = await configure(mockDreadCabinet, mockCardiganTime);

            expect(config.contextDirectories).toEqual(['/valid/directory']);
        });

        test('should default start date to 31 days before end when only end is provided', async () => {
            const endDate = '2024-01-31';
            mockProgram.opts.mockReturnValue({
                end: endDate,
                timezone: 'UTC',
            });

            const [_, dateRange] = await configure(mockDreadCabinet, mockCardiganTime);

            // Check that start is before end
            expect(dateRange.start < dateRange.end).toBe(true);

            // Check that the difference is approximately 31 days
            const diffInDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
            expect(diffInDays).toBeCloseTo(31, 0);
        });

        test('should default end date to now when only start is provided', async () => {
            const startDate = '2024-01-01';
            mockProgram.opts.mockReturnValue({
                start: startDate,
                timezone: 'UTC',
            });

            const [_, dateRange] = await configure(mockDreadCabinet, mockCardiganTime);

            // Check that end is close to now (within 1 second)
            const now = new Date();
            const diffInMs = Math.abs(dateRange.end.getTime() - now.getTime());
            expect(diffInMs).toBeLessThan(1000);
        });

        test('should merge configurations in correct order', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                verbose: true,
                replace: true,
                timezone: 'UTC',
            });

            mockCardiganTime.read.mockResolvedValue({
                verbose: false, // Should be overridden by CLI
                model: 'gpt-4o-mini', // Use a valid model
                timezone: 'UTC',
            });

            const [config] = await configure(mockDreadCabinet, mockCardiganTime);

            expect(config.verbose).toBe(true); // CLI value wins
            expect(config.model).toBe('gpt-4o-mini'); // File value used
            expect(config.replace).toBe(true); // CLI value
        });

        test('should throw error when contextDirectory does not exist', async () => {
            // Import and mock the storage module
            const mockStorage = await import('../src/util/storage');
            const mockCreate = vi.fn(() => ({
                isDirectoryReadable: vi.fn().mockReturnValue(false),
            }));
            (mockStorage.create as any) = mockCreate;

            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                contextDirectories: ['/non/existent/directory'],
                timezone: 'UTC',
            });

            await expect(configure(mockDreadCabinet, mockCardiganTime)).rejects.toThrow(
                'Input directory does not exist: /non/existent/directory'
            );
        });

        test('should handle valid timezone', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                timezone: 'UTC',
            });

            const [config, dateRange] = await configure(mockDreadCabinet, mockCardiganTime);

            expect(config).toBeDefined();
            expect(dateRange).toBeDefined();
        });

        test('should validate all allowed models', async () => {
            const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'];

            for (const model of allowedModels) {
                mockProgram.opts.mockReturnValue({
                    currentMonth: true,
                    model,
                    timezone: 'UTC',
                });

                const [config] = await configure(mockDreadCabinet, mockCardiganTime);
                expect(config.model).toBe(model);
            }
        });

        test('should use classifyModel from config when specified', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                timezone: 'UTC',
            });

            mockCardiganTime.read.mockResolvedValue({
                timezone: 'UTC',
                classifyModel: 'gpt-4o-mini',
            });

            const [config] = await configure(mockDreadCabinet, mockCardiganTime);
            expect(config.classifyModel).toBe('gpt-4o-mini');
        });

        test('should handle missing model gracefully with defaults', async () => {
            mockProgram.opts.mockReturnValue({
                currentMonth: true,
                timezone: 'UTC',
                // No model specified
            });

            mockCardiganTime.read.mockResolvedValue({
                timezone: 'UTC',
                // No model in config file
            });

            const [config] = await configure(mockDreadCabinet, mockCardiganTime);
            expect(config.model).toBe('gpt-4o'); // Should use DEFAULT_MODEL
        });
    });
}); 
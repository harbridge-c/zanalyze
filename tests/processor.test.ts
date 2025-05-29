import { describe, test, expect, vi, beforeEach } from 'vitest';
import { create } from '../src/processor';
import type { Config } from '../src/types';
import * as dreadcabinet from '@theunwalked/dreadcabinet';

// Mock dependencies
vi.mock('../src/logging', () => ({
    getLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }))
}));

const mockStorage = {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    exists: vi.fn(),
    isFile: vi.fn(),
    isDirectory: vi.fn()
};

vi.mock('../src/util/storage', () => ({
    create: vi.fn(() => mockStorage)
}));

vi.mock('../src/phases/process', () => ({
    create: vi.fn(() => ({}))
}));

vi.mock('@maxdrellin/xenocline', () => ({
    createBeginning: vi.fn(),
    createEventFilter: vi.fn(),
    createEventHandler: vi.fn((handlerFn) => {
        // createEventHandler returns the handler function that was passed to it
        return handlerFn;
    }),
    createFilteredHandler: vi.fn((filter, options) => {
        // Return a mock handler that will call the actual handler when the event matches
        return async (event: any, context: any) => {
            if (event.eventType === 'node' && event.eventName === 'processed' && options.handler) {
                return options.handler(event, context);
            }
        };
    }),
    executeProcess: vi.fn()
}));

describe('processor module', () => {
    let mockConfig: Config;
    let mockOperator: dreadcabinet.Operator;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConfig = {
            model: 'gpt-4o',
            verbose: false,
            debug: false,
            silly: false,
            dryRun: false,
            replace: false,
            classifyModel: 'gpt-4o',
            overrides: false,
            simplify: {
                headers: [],
                textOnly: true,
                skipAttachments: true
            },
            filters: {
                include: { subject: [], to: [], from: [] },
                exclude: { subject: [], to: [], from: [] }
            },
            timezone: 'Etc/UTC',
            extensions: ['eml'],
            inputStructure: 'month',
            inputFilenameOptions: ['date', 'subject'],
            outputStructure: 'month',
            outputFilenameOptions: ['date', 'subject'],
            inputDirectory: './input',
            outputDirectory: './output',
            configDirectory: '.zanalyze'
        } as Config;

        mockOperator = {} as dreadcabinet.Operator;

        // Reset mock implementations
        mockStorage.writeFile.mockClear();
        mockStorage.readFile.mockClear();
        mockStorage.exists.mockClear();
        mockStorage.isFile.mockClear();
        mockStorage.isDirectory.mockClear();
    });

    test('create should return an instance with process method', async () => {
        const instance = await create(mockConfig, mockOperator);

        expect(instance).toBeDefined();
        expect(instance.process).toBeDefined();
        expect(typeof instance.process).toBe('function');
    });

    test('process method should execute the processing pipeline', async () => {
        const { executeProcess } = await import('@maxdrellin/xenocline');
        const { create: createProcess } = await import('../src/phases/process');

        const instance = await create(mockConfig, mockOperator);
        const testFile = '/path/to/test.eml';

        await instance.process(testFile);

        // Verify that the process was created
        expect(createProcess).toHaveBeenCalledWith(mockConfig, mockOperator);

        // Verify that executeProcess was called
        expect(executeProcess).toHaveBeenCalled();

        // Verify the input contains the file path
        const executeProcessCall = (executeProcess as any).mock.calls[0];
        expect(executeProcessCall[2].input.file).toBe(testFile);
    });

    test('process should handle errors gracefully', async () => {
        const { executeProcess } = await import('@maxdrellin/xenocline');
        const error = new Error('Process execution failed');
        (executeProcess as any).mockRejectedValueOnce(error);

        const instance = await create(mockConfig, mockOperator);

        await expect(instance.process('/path/to/test.eml')).rejects.toThrow('Process execution failed');
    });

    test('nodeProcessedHandler should write context to file when conditions are met', async () => {
        const { executeProcess } = await import('@maxdrellin/xenocline');

        // Capture the event handlers passed to executeProcess
        let capturedEventHandlers: any[] = [];
        (executeProcess as any).mockImplementation(async (process: any, beginning: any, options: any) => {
            capturedEventHandlers = options.eventHandlers;
        });

        const instance = await create(mockConfig, mockOperator);
        await instance.process('/path/to/test.eml');

        // Now we have the actual event handler, let's test it
        expect(capturedEventHandlers).toHaveLength(1);
        const eventHandler = capturedEventHandlers[0];

        // Simulate a node processed event
        const mockEvent = {
            eventType: 'node',
            eventName: 'processed'
        };
        const mockContext = {
            contextPath: '/context/path',
            filename: 'test',
            include: true,
            data: 'test data'
        };

        // The handler is wrapped by createFilteredHandler, which checks the event type
        // We need to call the actual handler function
        await eventHandler(mockEvent, mockContext);

        expect(mockStorage.writeFile).toHaveBeenCalledWith(
            '/context/path/test.json',
            JSON.stringify(mockContext, null, 2),
            'utf-8'
        );
    });

    test('nodeProcessedHandler should not write file when include is false', async () => {
        const { executeProcess } = await import('@maxdrellin/xenocline');

        // Capture the event handlers passed to executeProcess
        let capturedEventHandlers: any[] = [];
        (executeProcess as any).mockImplementation(async (process: any, beginning: any, options: any) => {
            capturedEventHandlers = options.eventHandlers;
        });

        const instance = await create(mockConfig, mockOperator);
        await instance.process('/path/to/test.eml');

        const eventHandler = capturedEventHandlers[0];

        const mockEvent = {
            eventType: 'node',
            eventName: 'processed'
        };
        const mockContext = {
            contextPath: '/context/path',
            filename: 'test',
            include: false
        };

        await eventHandler(mockEvent, mockContext);

        expect(mockStorage.writeFile).not.toHaveBeenCalled();
    });

    test('nodeProcessedHandler should not write file when contextPath is missing', async () => {
        const { executeProcess } = await import('@maxdrellin/xenocline');

        // Capture the event handlers passed to executeProcess
        let capturedEventHandlers: any[] = [];
        (executeProcess as any).mockImplementation(async (process: any, beginning: any, options: any) => {
            capturedEventHandlers = options.eventHandlers;
        });

        const instance = await create(mockConfig, mockOperator);
        await instance.process('/path/to/test.eml');

        const eventHandler = capturedEventHandlers[0];

        const mockEvent = {
            eventType: 'node',
            eventName: 'processed'
        };
        const mockContext = {
            filename: 'test',
            include: true
        };

        await eventHandler(mockEvent, mockContext);

        expect(mockStorage.writeFile).not.toHaveBeenCalled();
    });
}); 
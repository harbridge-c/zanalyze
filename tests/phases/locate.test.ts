import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import * as Logging from '../../src/logging';
import * as Storage from '../../src/util/storage';
import { fromEml } from '../../src/util/email';
import {
    create,
    createCheckExistingDecision,
    Input,
    Output,
    LOCATE_PHASE_NODE_NAME,
    LOCATE_PHASE_NAME,
    CHECK_EXISTING_DECISION_NAME,
    SKIP_CONNECTION_NAME
} from '../../src/phases/locate';
import { FILTER_PHASE_NODE_NAME } from '../../src/phases/filter';

// Mock dependencies
vi.mock('../../src/logging');
vi.mock('../../src/util/storage');
vi.mock('../../src/util/email');
vi.mock('@maxdrellin/xenocline', () => ({
    createConnection: vi.fn((name, target, options) => ({ name, target, options })),
    createDecision: vi.fn((name, decide) => ({ name, decide })),
    createPhase: vi.fn((name, options) => ({ name, ...options })),
    createPhaseNode: vi.fn((name, phase, options) => ({
        id: name,
        type: 'phase',
        phase,
        ...options
    })),
    createTermination: vi.fn((name) => ({ type: 'termination', name })),
}));

describe('locate phase', () => {
    let mockLogger: any;
    let mockStorage: any;
    let mockOperator: any;
    let mockEmlContent: EmlContent;

    beforeEach(() => {
        // Setup mock logger
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        };
        vi.mocked(Logging.getLogger).mockReturnValue(mockLogger);

        // Setup mock storage
        mockStorage = {
            readFile: vi.fn(),
            hashFile: vi.fn(),
            createDirectory: vi.fn(),
            exists: vi.fn(),
        };
        vi.mocked(Storage.create).mockReturnValue(mockStorage);

        // Setup mock operator
        mockOperator = {
            constructOutputDirectory: vi.fn(),
            constructFilename: vi.fn(),
        };

        // Setup mock EML content
        mockEmlContent = {
            date: new Date('2024-01-15T10:00:00Z'),
            subject: 'Test Email Subject',
            from: [{ email: 'sender@example.com', name: 'Sender' }],
            to: [{ email: 'recipient@example.com', name: 'Recipient' }],
            text: 'Test email body',
            html: '<p>Test email body</p>',
            headers: {},
            attachments: [],
        };

        vi.mocked(fromEml).mockReturnValue(mockEmlContent);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a locate phase node with proper configuration', async () => {
            const config = {};
            const phaseNode = await create(config as any, mockOperator);

            expect(phaseNode.id).toBe(LOCATE_PHASE_NODE_NAME);
            expect(phaseNode.phase.name).toBe(LOCATE_PHASE_NAME);
            expect(phaseNode.next).toBeDefined();
            expect(Array.isArray(phaseNode.next)).toBe(true);

            // Type assertion to handle the Next type properly
            const nextArray = phaseNode.next as readonly any[];
            expect(nextArray).toHaveLength(1);
            expect(nextArray[0].name).toBe(CHECK_EXISTING_DECISION_NAME);
            expect(phaseNode.process).toBeDefined();
        });

        describe('execute function', () => {
            it('should process an email file successfully', async () => {
                const config = {};
                const phaseNode = await create(config as any, mockOperator);

                // Setup mocks
                const fileContent = 'email content';
                mockStorage.readFile.mockResolvedValue(fileContent);
                mockStorage.hashFile.mockResolvedValue('abcdef1234567890');
                mockOperator.constructOutputDirectory.mockResolvedValue('/output/2024/01/15');
                mockOperator.constructFilename.mockResolvedValue('20240115_100000_output_abcdef12_Test_Email_S');

                const input: Input = { file: '/path/to/email.eml' };
                const output = await phaseNode.phase.execute(input);

                expect(mockStorage.readFile).toHaveBeenCalledWith('/path/to/email.eml', 'utf8');
                expect(fromEml).toHaveBeenCalledWith(fileContent);
                expect(mockStorage.hashFile).toHaveBeenCalledWith('/path/to/email.eml', 100);
                expect(mockOperator.constructOutputDirectory).toHaveBeenCalledWith(mockEmlContent.date);
                expect(mockStorage.createDirectory).toHaveBeenCalledWith('/output/2024/01/15/.context');
                expect(mockOperator.constructFilename).toHaveBeenCalledWith(
                    mockEmlContent.date,
                    'output',
                    'abcdef12',
                    { subject: 'Test_Email_S' }
                );

                expect(output).toEqual({
                    creationTime: mockEmlContent.date,
                    outputPath: '/output/2024/01/15',
                    contextPath: '/output/2024/01/15/.context',
                    hash: 'abcdef12',
                    filename: '20240115_100000_output_abcdef12_Test_Email_S',
                    eml: mockEmlContent,
                });
            });

            it('should handle emails without subject', async () => {
                const config = {};
                const phaseNode = await create(config as any, mockOperator);

                mockEmlContent.subject = '';
                mockStorage.readFile.mockResolvedValue('email content');
                mockStorage.hashFile.mockResolvedValue('abcdef1234567890');
                mockOperator.constructOutputDirectory.mockResolvedValue('/output/2024/01/15');
                mockOperator.constructFilename.mockResolvedValue('20240115_100000_output_abcdef12');

                const input: Input = { file: '/path/to/email.eml' };
                const output = await phaseNode.phase.execute(input);

                expect(mockOperator.constructFilename).toHaveBeenCalledWith(
                    mockEmlContent.date,
                    'output',
                    'abcdef12',
                    { subject: '' }
                );
                expect(output.filename).toBe('20240115_100000_output_abcdef12');
            });

            it('should sanitize subject for filename', async () => {
                const config = {};
                const phaseNode = await create(config as any, mockOperator);

                mockEmlContent.subject = 'Re: [URGENT] Test/Email\\Subject';
                mockStorage.readFile.mockResolvedValue('email content');
                mockStorage.hashFile.mockResolvedValue('abcdef1234567890');
                mockOperator.constructOutputDirectory.mockResolvedValue('/output/2024/01/15');
                mockOperator.constructFilename.mockResolvedValue('20240115_100000_output_abcdef12_Re___URGENT_');

                const input: Input = { file: '/path/to/email.eml' };
                await phaseNode.phase.execute(input);

                expect(mockOperator.constructFilename).toHaveBeenCalledWith(
                    mockEmlContent.date,
                    'output',
                    'abcdef12',
                    { subject: 'Re___URGENT_' }
                );
            });
        });

        describe('process method', () => {
            it('should merge output into context', async () => {
                const config = {};
                const phaseNode = await create(config as any, mockOperator);

                const output: Output = {
                    creationTime: new Date('2024-01-15T10:00:00Z'),
                    outputPath: '/output/path',
                    contextPath: '/context/path',
                    hash: '12345678',
                    filename: 'test_file',
                    eml: mockEmlContent,
                };

                const context: Context = {
                    existingProp: 'value',
                };

                const processFn = phaseNode.process;
                expect(processFn).toBeDefined();

                if (processFn) {
                    const [processedOutput, processedContext] = await processFn(output, context);

                    expect(processedOutput).toBe(output);
                    expect(processedContext).toEqual({
                        existingProp: 'value',
                        creationTime: output.creationTime,
                        outputPath: output.outputPath,
                        contextPath: output.contextPath,
                        hash: output.hash,
                        filename: output.filename,
                        eml: output.eml,
                    });
                }
            });
        });
    });

    describe('createCheckExistingDecision', () => {
        let decision: any;

        beforeEach(async () => {
            decision = await createCheckExistingDecision();
        });

        it('should create decision with correct name', () => {
            expect(decision.name).toBe(CHECK_EXISTING_DECISION_NAME);
        });

        describe('decide function', () => {
            it('should return termination when context file exists', async () => {
                mockStorage.exists.mockResolvedValue(true);

                const output: Output = {
                    creationTime: new Date(),
                    outputPath: '/output',
                    contextPath: '/output/.context',
                    hash: '12345678',
                    filename: 'test_file',
                    eml: mockEmlContent,
                };

                const result = await decision.decide(output);

                expect(mockStorage.exists).toHaveBeenCalledWith('/output/.context/test_file.json');
                expect(result).toEqual({
                    type: 'termination',
                    name: SKIP_CONNECTION_NAME,
                });
                expect(mockLogger.info).toHaveBeenCalledWith(
                    'Context file already exists for test_file, skipping...'
                );
            });

            it('should return connection to filter phase when context file does not exist', async () => {
                mockStorage.exists.mockResolvedValue(false);

                const output: Output = {
                    creationTime: new Date(),
                    outputPath: '/output',
                    contextPath: '/output/.context',
                    hash: '12345678',
                    filename: 'test_file',
                    eml: mockEmlContent,
                };

                const result = await decision.decide(output);

                expect(mockStorage.exists).toHaveBeenCalledWith('/output/.context/test_file.json');
                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(1);
                expect(result[0]).toEqual({
                    name: 'to_filter_from_decision',
                    target: FILTER_PHASE_NODE_NAME,
                    options: expect.objectContaining({ transform: expect.any(Function) }),
                });
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    'Context file does not exist for test_file, proceeding to filter...'
                );
            });

            it('should transform output correctly for filter phase', async () => {
                mockStorage.exists.mockResolvedValue(false);

                const output: Output = {
                    creationTime: new Date(),
                    outputPath: '/output',
                    contextPath: '/output/.context',
                    hash: '12345678',
                    filename: 'test_file',
                    eml: mockEmlContent,
                };

                const context: Context = {
                    existingProp: 'value',
                };

                const result = await decision.decide(output);
                const connection = result[0];
                const transform = connection.options.transform;

                const [filterInput, transformedContext] = await transform(output, context);

                expect(filterInput).toEqual({
                    eml: mockEmlContent,
                });

                expect(transformedContext).toEqual({
                    existingProp: 'value',
                    creationTime: output.creationTime,
                    outputPath: output.outputPath,
                    contextPath: output.contextPath,
                    hash: output.hash,
                    filename: output.filename,
                    eml: output.eml,
                });
            });
        });
    });
});

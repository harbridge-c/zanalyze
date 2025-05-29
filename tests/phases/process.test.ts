import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create, PROCESS_NAME } from '../../src/phases/process';
import { Config } from '../../src/types';
import * as dreadcabinet from '@theunwalked/dreadcabinet';

// Mock all the phase modules
vi.mock('../../src/phases/bill');
vi.mock('../../src/phases/classify');
vi.mock('../../src/phases/filter');
vi.mock('../../src/phases/locate');
vi.mock('../../src/phases/receipt');
vi.mock('../../src/phases/sentry/aggregator');
vi.mock('../../src/phases/sentry/bill');
vi.mock('../../src/phases/sentry/event');
vi.mock('../../src/phases/sentry/person');
vi.mock('../../src/phases/sentry/receipt');
vi.mock('../../src/phases/simplify');
vi.mock('../../src/phases/summarize');

// Mock xenocline
vi.mock('@maxdrellin/xenocline');

// Import mocked modules
import { createProcess } from '@maxdrellin/xenocline';
import { create as createBillNode, BILL_PHASE_NODE_NAME } from '../../src/phases/bill';
import { create as createClassifyNode, CLASSIFY_PHASE_NODE_NAME } from '../../src/phases/classify';
import { create as createFilterNode, FILTER_PHASE_NODE_NAME } from '../../src/phases/filter';
import { create as createLocateNode, LOCATE_PHASE_NODE_NAME } from '../../src/phases/locate';
import { create as createReceiptNode, RECEIPT_PHASE_NODE_NAME } from '../../src/phases/receipt';
import { create as createSentryAggregatorNode, SENTRY_AGGREGATOR_NODE_NAME } from '../../src/phases/sentry/aggregator';
import { create as createBillSentryNode, BILL_SENTRY_PHASE_NODE_NAME } from '../../src/phases/sentry/bill';
import { create as createEventSentryNode, EVENT_SENTRY_PHASE_NODE_NAME } from '../../src/phases/sentry/event';
import { create as createPersonSentryNode, PERSON_SENTRY_PHASE_NODE_NAME } from '../../src/phases/sentry/person';
import { create as createReceiptSentryNode, RECEIPT_SENTRY_PHASE_NODE_NAME } from '../../src/phases/sentry/receipt';
import { create as createSimplifyNode, SIMPLIFY_PHASE_NODE_NAME } from '../../src/phases/simplify';
import { create as createSummarizeNode, SUMMARIZE_PHASE_NODE_NAME } from '../../src/phases/summarize';

describe('process', () => {
    let mockConfig: Config;
    let mockOperator: dreadcabinet.Operator;
    let mockProcess: any;

    // Mock nodes
    const mockLocateNode = { name: 'locate' };
    const mockFilterNode = { name: 'filter' };
    const mockSimplifyNode = { name: 'simplify' };
    const mockClassifyNode = { name: 'classify' };
    const mockEventSentryNode = { name: 'eventSentry' };
    const mockPersonSentryNode = { name: 'personSentry' };
    const mockReceiptSentryNode = { name: 'receiptSentry' };
    const mockSummarizeNode = { name: 'summarize' };
    const mockReceiptNode = { name: 'receipt' };
    const mockSentryAggregatorNode = { name: 'sentryAggregator' };
    const mockBillSentryNode = { name: 'billSentry' };
    const mockBillNode = { name: 'bill' };

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Setup mock config and operator
        mockConfig = {
            // Add any required config properties
        } as Config;

        mockOperator = {
            // Add any required operator properties
        } as dreadcabinet.Operator;

        mockProcess = { name: PROCESS_NAME, phases: {} };

        // Setup mock returns for all create functions
        vi.mocked(createLocateNode).mockResolvedValue(mockLocateNode as any);
        vi.mocked(createFilterNode).mockResolvedValue(mockFilterNode as any);
        vi.mocked(createSimplifyNode).mockResolvedValue(mockSimplifyNode as any);
        vi.mocked(createClassifyNode).mockResolvedValue(mockClassifyNode as any);
        vi.mocked(createEventSentryNode).mockResolvedValue(mockEventSentryNode as any);
        vi.mocked(createPersonSentryNode).mockResolvedValue(mockPersonSentryNode as any);
        vi.mocked(createReceiptSentryNode).mockResolvedValue(mockReceiptSentryNode as any);
        vi.mocked(createSummarizeNode).mockResolvedValue(mockSummarizeNode as any);
        vi.mocked(createReceiptNode).mockResolvedValue(mockReceiptNode as any);
        vi.mocked(createSentryAggregatorNode).mockResolvedValue(mockSentryAggregatorNode as any);
        vi.mocked(createBillSentryNode).mockResolvedValue(mockBillSentryNode as any);
        vi.mocked(createBillNode).mockResolvedValue(mockBillNode as any);

        // Setup mock return for createProcess
        vi.mocked(createProcess).mockReturnValue(mockProcess);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('create', () => {
        it('should create all phase nodes with correct parameters', async () => {
            await create(mockConfig, mockOperator);

            // Verify each phase node was created with correct parameters
            expect(createLocateNode).toHaveBeenCalledWith(mockConfig, mockOperator);
            expect(createFilterNode).toHaveBeenCalledWith(mockConfig);
            expect(createSimplifyNode).toHaveBeenCalledWith(mockConfig);
            expect(createClassifyNode).toHaveBeenCalledWith(mockConfig);
            expect(createEventSentryNode).toHaveBeenCalledWith(mockConfig);
            expect(createPersonSentryNode).toHaveBeenCalledWith(mockConfig);
            expect(createReceiptSentryNode).toHaveBeenCalledWith(mockConfig);
            expect(createSummarizeNode).toHaveBeenCalledWith(mockConfig);
            expect(createReceiptNode).toHaveBeenCalledWith(mockConfig);
            expect(createSentryAggregatorNode).toHaveBeenCalledWith();
            expect(createBillSentryNode).toHaveBeenCalledWith(mockConfig);
            expect(createBillNode).toHaveBeenCalledWith(mockConfig);
        });

        it('should create process with all phases in correct structure', async () => {
            await create(mockConfig, mockOperator);

            expect(createProcess).toHaveBeenCalledWith(PROCESS_NAME, {
                phases: {
                    [LOCATE_PHASE_NODE_NAME]: mockLocateNode,
                    [SIMPLIFY_PHASE_NODE_NAME]: mockSimplifyNode,
                    [FILTER_PHASE_NODE_NAME]: mockFilterNode,
                    [CLASSIFY_PHASE_NODE_NAME]: mockClassifyNode,
                    [EVENT_SENTRY_PHASE_NODE_NAME]: mockEventSentryNode,
                    [PERSON_SENTRY_PHASE_NODE_NAME]: mockPersonSentryNode,
                    [RECEIPT_SENTRY_PHASE_NODE_NAME]: mockReceiptSentryNode,
                    [SENTRY_AGGREGATOR_NODE_NAME]: mockSentryAggregatorNode,
                    [RECEIPT_PHASE_NODE_NAME]: mockReceiptNode,
                    [SUMMARIZE_PHASE_NODE_NAME]: mockSummarizeNode,
                    [BILL_SENTRY_PHASE_NODE_NAME]: mockBillSentryNode,
                    [BILL_PHASE_NODE_NAME]: mockBillNode,
                }
            });
        });

        it('should return the created process', async () => {
            const result = await create(mockConfig, mockOperator);

            expect(result).toBe(mockProcess);
        });

        it('should handle errors when creating phase nodes', async () => {
            const error = new Error('Failed to create locate node');
            vi.mocked(createLocateNode).mockRejectedValue(error);

            await expect(create(mockConfig, mockOperator)).rejects.toThrow(error);
        });

        it('should create all nodes before creating the process', async () => {
            const callOrder: string[] = [];

            vi.mocked(createLocateNode).mockImplementation(async () => {
                callOrder.push('createLocateNode');
                return mockLocateNode as any;
            });

            vi.mocked(createProcess).mockImplementation(() => {
                callOrder.push('createProcess');
                return mockProcess;
            });

            await create(mockConfig, mockOperator);

            const createProcessIndex = callOrder.indexOf('createProcess');
            const createLocateNodeIndex = callOrder.indexOf('createLocateNode');

            expect(createLocateNodeIndex).toBeLessThan(createProcessIndex);
        });

        it('should pass correct phase names to createProcess', async () => {
            await create(mockConfig, mockOperator);

            expect(createProcess).toHaveBeenCalled();
            const calls = vi.mocked(createProcess).mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            const passedPhases = calls[0][1].phases;
            expect(passedPhases).toBeDefined();

            const expectedPhaseNames = [
                LOCATE_PHASE_NODE_NAME,
                SIMPLIFY_PHASE_NODE_NAME,
                FILTER_PHASE_NODE_NAME,
                CLASSIFY_PHASE_NODE_NAME,
                EVENT_SENTRY_PHASE_NODE_NAME,
                PERSON_SENTRY_PHASE_NODE_NAME,
                RECEIPT_SENTRY_PHASE_NODE_NAME,
                SENTRY_AGGREGATOR_NODE_NAME,
                RECEIPT_PHASE_NODE_NAME,
                SUMMARIZE_PHASE_NODE_NAME,
                BILL_SENTRY_PHASE_NODE_NAME,
                BILL_PHASE_NODE_NAME,
            ];

            expect(Object.keys(passedPhases!)).toEqual(expectedPhaseNames);
        });
    });

    describe('Context interface', () => {
        it('should define optional properties correctly', () => {
            // This is a type test - it ensures the Context interface is properly defined
            const context: Partial<import('../../src/phases/process').Context> = {
                file: 'test.txt',
                creationTime: new Date(),
                outputPath: '/output',
                contextPath: '/context',
                hash: 'abc123',
                filename: 'test.txt',
                eml: null,
                include: true,
                classifications: {} as any,
                events: {} as any,
                people: {} as any,
                bills: {} as any,
                transactions: {} as any,
                summary: 'test summary',
                receipt: 'test receipt',
                bill: 'test bill',
            };

            expect(context).toBeDefined();
        });
    });

    describe('exports', () => {
        it('should export PROCESS_NAME constant', () => {
            expect(PROCESS_NAME).toBe('Process');
        });
    });
});

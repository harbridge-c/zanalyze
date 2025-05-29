import { Context } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BILL_PHASE_NODE_NAME } from '../../../src/phases/bill';
import { Classifications } from '../../../src/phases/classify';
import { RECEIPT_PHASE_NODE_NAME } from '../../../src/phases/receipt';
import {
    create,
    Input,
    Output,
    SENTRY_AGGREGATOR_NAME
} from '../../../src/phases/sentry/aggregator';
import { Bills } from '../../../src/phases/sentry/bill';
import { Events } from '../../../src/phases/sentry/event';
import { People } from '../../../src/phases/sentry/person';
import { Transactions } from '../../../src/phases/sentry/receipt';
import { SUMMARIZE_PHASE_NODE_NAME } from '../../../src/phases/summarize';

// Mock the logger
vi.mock('../../../src/logging', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

describe('Sentry Aggregator', () => {
    let mockEml: EmlContent;
    let mockContext: Context;
    let mockInput: Input;

    beforeEach(() => {
        // Mock EML content - properly typed
        mockEml = {
            html: '<html></html>',
            text: 'test email',
            headers: {},
            attachments: [],
            date: new Date(),
            subject: 'Test Email',
            from: [],
            to: [],
        } as EmlContent;

        // Mock context
        mockContext = {
            id: 'test-context-id',
            timestamp: new Date().toISOString(),
        } as Context;

        // Mock input with all required fields - using proper Classification type
        mockInput = {
            eml: mockEml,
            outputPath: '/test/output',
            hash: 'test-hash',
            filename: 'test.eml',
            contextPath: '/test/context',
            classifications: [
                {
                    coordinate: ['personal', 'family'],
                    strength: 0.9,
                    reason: 'Family related email'
                }
            ] as Classifications,
            events: [] as Events,
            people: [] as People,
            transactions: [] as Transactions,
            bills: [] as Bills,
        };
    });

    describe('create', () => {
        it('should create a SentryAggregatorNode with correct properties', async () => {
            const node = await create();

            expect(node).toBeDefined();
            expect(node.aggregator).toBeDefined();
            expect(node.aggregator.name).toBe(SENTRY_AGGREGATOR_NAME);
            expect(node.next).toBeDefined();
            // Just check that next exists and has one item
            expect(node.next).toBeTruthy();
        });
    });

    describe('aggregate function', () => {
        it('should return Ready status when all required fields are present', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            // Provide all required fields with proper types
            const inputWithAllFields: Input = {
                ...mockInput,
                events: [
                    {
                        name: 'Meeting',
                        date: '2024-01-01',
                        time: '14:00',
                        eventType: 'meeting',
                        dateType: 'exact',
                        location: 'Conference Room',
                        description: 'Team meeting',
                        category: 'work',
                        reason: 'Weekly sync'
                    }
                ] as Events,
                people: [
                    {
                        name: 'John Doe',
                        role: 'Manager',
                        category: 'work',
                        reason: 'Team manager'
                    }
                ] as People,
                classifications: [
                    {
                        coordinate: ['professional', 'work'],
                        strength: 0.95,
                        reason: 'Work-related email'
                    }
                ] as Classifications,
                transactions: [
                    {
                        date: '2024-01-01',
                        amount: 100.00,
                        description: 'Purchase',
                        type: 'order',
                        category: 'food',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Store Inc',
                        merchant_type: 'other',
                        reason: 'Grocery purchase'
                    }
                ] as Transactions,
                bills: [
                    {
                        provider: 'Electric Company',
                        kind: 'utility',
                        amount_due: 150.00,
                        due_date: '2024-02-01',
                        period: 'January 2024',
                        status: 'due',
                        description: 'Monthly electricity bill',
                        reason: 'Utility payment'
                    }
                ] as Bills,
            };

            const result = await aggregator.aggregate(inputWithAllFields, mockContext);

            expect(result.status).toBe('Ready');
            if (result.status === 'Ready' && 'output' in result) {
                expect(result.output).toBeDefined();
                expect(result.output).toMatchObject({
                    ...mockContext,
                    ...inputWithAllFields,
                });
            }
        });

        it('should return NotYetReady status when events are missing', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputMissingEvents: Input = {
                ...mockInput,
                events: undefined as any,
                people: [
                    {
                        name: 'Jane Doe',
                        role: 'Colleague',
                        category: 'work',
                        reason: 'Team member'
                    }
                ] as People,
                classifications: mockInput.classifications,
                transactions: [] as Transactions,
                bills: [] as Bills,
            };

            const result = await aggregator.aggregate(inputMissingEvents, mockContext);

            expect(result.status).toBe('NotYetReady');
            if (result.status === 'NotYetReady') {
                expect('output' in result).toBe(false);
            }
        });

        it('should return NotYetReady status when people are missing', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputMissingPeople: Input = {
                ...mockInput,
                events: [] as Events,
                people: undefined as any,
                classifications: mockInput.classifications,
                transactions: [] as Transactions,
                bills: [] as Bills,
            };

            const result = await aggregator.aggregate(inputMissingPeople, mockContext);

            expect(result.status).toBe('NotYetReady');
        });

        it('should return NotYetReady status when classifications are missing', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputMissingClassifications: Input = {
                ...mockInput,
                events: [] as Events,
                people: [] as People,
                classifications: undefined as any,
                transactions: [] as Transactions,
                bills: [] as Bills,
            };

            const result = await aggregator.aggregate(inputMissingClassifications, mockContext);

            expect(result.status).toBe('NotYetReady');
        });

        it('should return NotYetReady status when transactions are missing', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputMissingTransactions: Input = {
                ...mockInput,
                events: [] as Events,
                people: [] as People,
                classifications: mockInput.classifications,
                transactions: undefined as any,
                bills: [] as Bills,
            };

            const result = await aggregator.aggregate(inputMissingTransactions, mockContext);

            expect(result.status).toBe('NotYetReady');
        });

        it('should return NotYetReady status when bills are missing', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputMissingBills: Input = {
                ...mockInput,
                events: [] as Events,
                people: [] as People,
                classifications: mockInput.classifications,
                transactions: [] as Transactions,
                bills: undefined as any,
            };

            const result = await aggregator.aggregate(inputMissingBills, mockContext);

            expect(result.status).toBe('NotYetReady');
        });

        it('should handle empty arrays as valid data', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const inputWithEmptyArrays: Input = {
                ...mockInput,
                events: [],
                people: [],
                classifications: [],
                transactions: [],
                bills: [],
            };

            const result = await aggregator.aggregate(inputWithEmptyArrays, mockContext);

            expect(result.status).toBe('Ready');
            if (result.status === 'Ready' && 'output' in result) {
                expect(result.output).toBeDefined();
            }
        });
    });

    describe('decide function', () => {
        it('should route to BILL_PHASE when bills are present', async () => {
            const node = await create();
            // Get the decision function directly
            const decisions = node.next as any;
            const decision = decisions?.[0];

            if (!decision || !decision.decide) {
                throw new Error('Decision not found or does not have decide method');
            }

            const outputWithBills: Output = {
                ...mockInput,
                ...mockContext,
                bills: [
                    {
                        provider: 'Gas Company',
                        kind: 'utility',
                        amount_due: 75.00,
                        due_date: '2024-02-15',
                        period: 'January 2024',
                        status: 'due',
                        description: 'Monthly gas bill',
                        reason: 'Utility payment'
                    }
                ] as Bills,
                transactions: [
                    {
                        date: '2024-01-01',
                        amount: 50.00,
                        description: 'Purchase',
                        type: 'order',
                        category: 'food',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Restaurant',
                        merchant_type: 'other',
                        reason: 'Lunch purchase'
                    }
                ] as Transactions,
            };

            const result = await decision.decide(outputWithBills, mockContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);

            // Check the Connection object structure
            const connection = result[0];
            expect(connection).toBeDefined();
            expect(connection.id).toBe('toBill');
            expect(connection.type).toBe('connection');
            expect(connection.targetNodeId).toBe(BILL_PHASE_NODE_NAME);
        });

        it('should route to RECEIPT_PHASE when transactions are present but no bills', async () => {
            const node = await create();
            // Get the decision function directly
            const decisions = node.next as any;
            const decision = decisions?.[0];

            if (!decision || !decision.decide) {
                throw new Error('Decision not found or does not have decide method');
            }

            const outputWithTransactions: Output = {
                ...mockInput,
                ...mockContext,
                bills: [],
                transactions: [
                    {
                        date: '2024-01-01',
                        amount: 25.00,
                        description: 'Coffee',
                        type: 'order',
                        category: 'food',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Coffee Shop',
                        merchant_type: 'other',
                        reason: 'Morning coffee'
                    }
                ] as Transactions,
            };

            const result = await decision.decide(outputWithTransactions, mockContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);

            // Check the Connection object structure
            const connection = result[0];
            expect(connection).toBeDefined();
            expect(connection.id).toBe('toReceipt');
            expect(connection.type).toBe('connection');
            expect(connection.targetNodeId).toBe(RECEIPT_PHASE_NODE_NAME);
        });

        it('should route to SUMMARIZE_PHASE when no bills or transactions', async () => {
            const node = await create();
            // Get the decision function directly
            const decisions = node.next as any;
            const decision = decisions?.[0];

            if (!decision || !decision.decide) {
                throw new Error('Decision not found or does not have decide method');
            }

            const outputWithNoBillsOrTransactions: Output = {
                ...mockInput,
                ...mockContext,
                bills: [],
                transactions: [],
            };

            const result = await decision.decide(outputWithNoBillsOrTransactions, mockContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);

            // Check the Connection object structure
            const connection = result[0];
            expect(connection).toBeDefined();
            expect(connection.id).toBe('toSummarize');
            expect(connection.type).toBe('connection');
            expect(connection.targetNodeId).toBe(SUMMARIZE_PHASE_NODE_NAME);
        });

        it('should prioritize bills over transactions when both are present', async () => {
            const node = await create();
            // Get the decision function directly
            const decisions = node.next as any;
            const decision = decisions?.[0];

            if (!decision || !decision.decide) {
                throw new Error('Decision not found or does not have decide method');
            }

            const outputWithBothBillsAndTransactions: Output = {
                ...mockInput,
                ...mockContext,
                bills: [
                    {
                        provider: 'Internet Provider',
                        kind: 'utility',
                        amount_due: 80.00,
                        due_date: '2024-02-20',
                        period: 'January 2024',
                        status: 'due',
                        description: 'Monthly internet bill',
                        reason: 'Internet service'
                    },
                    {
                        provider: 'Insurance Co',
                        kind: 'insurance',
                        amount_due: 200.00,
                        due_date: '2024-02-25',
                        period: 'Q1 2024',
                        status: 'due',
                        description: 'Quarterly insurance',
                        reason: 'Car insurance'
                    }
                ] as Bills,
                transactions: [
                    {
                        date: '2024-01-01',
                        amount: 150.00,
                        description: 'Groceries',
                        type: 'order',
                        category: 'food',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Supermarket',
                        merchant_type: 'other',
                        reason: 'Weekly groceries'
                    },
                    {
                        date: '2024-01-02',
                        amount: 30.00,
                        description: 'Gas',
                        type: 'order',
                        category: 'transportation',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Gas Station',
                        merchant_type: 'transportation',
                        reason: 'Fuel purchase'
                    }
                ] as Transactions,
            };

            const result = await decision.decide(outputWithBothBillsAndTransactions, mockContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);

            // Check the Connection object structure
            const connection = result[0];
            expect(connection).toBeDefined();
            expect(connection.id).toBe('toBill');
            expect(connection.type).toBe('connection');
            expect(connection.targetNodeId).toBe(BILL_PHASE_NODE_NAME);
        });
    });

    describe('integration', () => {
        it('should combine context and input correctly in output', async () => {
            const node = await create();
            const aggregator = node.aggregator;

            const extendedContext: Context = {
                id: 'context-123',
                timestamp: '2024-01-01T00:00:00Z',
                someExtraField: 'extra-value',
            } as any;

            const completeInput: Input = {
                ...mockInput,
                events: [
                    {
                        name: 'Doctor Appointment',
                        date: '2024-02-15',
                        time: '10:00',
                        eventType: 'appointment',
                        dateType: 'exact',
                        location: 'Medical Center',
                        description: 'Annual checkup',
                        category: 'health',
                        reason: 'Regular health checkup'
                    }
                ] as Events,
                people: [
                    {
                        name: 'Dr. Smith',
                        role: 'Doctor',
                        category: 'other',
                        reason: 'Healthcare provider'
                    }
                ] as People,
                classifications: [
                    {
                        coordinate: ['personal', 'health'],
                        strength: 0.9,
                        reason: 'Medical appointment'
                    },
                    {
                        coordinate: ['important_and_urgent'],
                        strength: 0.8,
                        reason: 'Time-sensitive appointment'
                    }
                ] as Classifications,
                transactions: [
                    {
                        date: '2024-01-05',
                        amount: 200.00,
                        description: 'Medical payment',
                        type: 'order',
                        category: 'other',
                        status: 'completed',
                        due_date: '',
                        merchant_organization: 'Medical Center',
                        merchant_type: 'other',
                        reason: 'Medical service payment'
                    }
                ] as Transactions,
                bills: [
                    {
                        provider: 'Medical Insurance',
                        kind: 'insurance',
                        amount_due: 300.00,
                        due_date: '2024-02-28',
                        period: 'February 2024',
                        status: 'due',
                        description: 'Monthly health insurance',
                        reason: 'Health insurance premium'
                    }
                ] as Bills,
            };

            const result = await aggregator.aggregate(completeInput, extendedContext);

            expect(result.status).toBe('Ready');
            if (result.status === 'Ready' && 'output' in result) {
                expect(result.output).toMatchObject({
                    // Context fields
                    id: 'context-123',
                    timestamp: '2024-01-01T00:00:00Z',
                    someExtraField: 'extra-value',
                    // Input fields
                    eml: mockEml,
                    outputPath: '/test/output',
                    hash: 'test-hash',
                    filename: 'test.eml',
                    contextPath: '/test/context',
                    classifications: completeInput.classifications,
                    events: completeInput.events,
                    people: completeInput.people,
                    transactions: completeInput.transactions,
                    bills: completeInput.bills,
                });
            }
        });
    });
});

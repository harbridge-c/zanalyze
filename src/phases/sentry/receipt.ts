import { Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { z } from 'zod';
import { Classifications } from '../classify';
import { createSentryPhaseNode } from './sentryPhaseFactory';

export const RECEIPT_SENTRY_PHASE_NAME = 'receipt_sentry';
export const RECEIPT_SENTRY_PHASE_NODE_NAME = 'receipt_sentry_node';

// Transaction schema and types
export const TransactionSchema = z.object({
    date: z.string(),
    amount: z.number(),
    description: z.string(),
    type: z.enum(['deposit', 'withdrawal', 'order', 'receipt', 'transfer', 'other']),
    category: z.enum(['food', 'transportation', 'housing', 'utilities', 'entertainment', 'education', 'loan', 'credit', 'other']),
    status: z.enum(['pending', 'completed', 'failed', 'due', 'paid', 'overdue', 'other']),
    due_date: z.string(),
    merchant_organization: z.string(),
    merchant_type: z.enum(['bank', 'delivery_service', 'transportation', 'housing', 'utilities', 'entertainment', 'education', 'loan', 'credit', 'other']),
    reason: z.string(),
});

export const TransactionsSchema = z.array(TransactionSchema);

export type Transaction = z.infer<typeof TransactionSchema>;
export type Transactions = z.infer<typeof TransactionsSchema>;

export interface Input extends PhaseInput {
    eml: EmlContent;
    classifications: Classifications;
    outputPath: string;
    detailPath: string;
    hash: string;
    filename: string;
    contextPath: string;
};

export interface Output extends PhaseOutput {
    transactions: Transactions;
};

export type ReceiptSentryPhaseNode = PhaseNode<Input, Output>;

export type Config = {
    classifyModel: string;
    configDirectory: string;
    overrides: any;
    model: string;
    debug: boolean;
};

export const create = createSentryPhaseNode({
    phaseName: RECEIPT_SENTRY_PHASE_NAME,
    phaseNodeName: RECEIPT_SENTRY_PHASE_NODE_NAME,
    outputKey: 'transactions',
    schema: TransactionsSchema,
    promptFunctionName: 'createReceiptSentryPrompt',
});





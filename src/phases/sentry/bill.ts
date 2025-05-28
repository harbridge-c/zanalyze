import { Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { z } from 'zod';
import { Classifications } from '../classify';
import { createSentryPhaseNode } from './sentryPhaseFactory';

export const BILL_SENTRY_PHASE_NAME = 'bill_sentry';
export const BILL_SENTRY_PHASE_NODE_NAME = 'bill_sentry_node';

// Bill schema and types
export const BillSchema = z.object({
    provider: z.string(),
    kind: z.enum(['utility', 'insurance', 'loan', 'rent', 'subscription', 'other']),
    amount_due: z.number(),
    due_date: z.string(),
    period: z.string(),
    status: z.enum(['due', 'paid', 'overdue', 'other']),
    description: z.string(),
    reason: z.string(),
});

export const BillsSchema = z.array(BillSchema);

export type Bill = z.infer<typeof BillSchema>;
export type Bills = z.infer<typeof BillsSchema>;

export interface Input extends PhaseInput {
    eml: EmlContent;
    classifications: Classifications;
    outputPath: string;
    hash: string;
    filename: string;
    contextPath: string;
};

export interface Output extends PhaseOutput {
    bills: Bills;
};

export type BillSentryPhaseNode = PhaseNode<Input, Output>;

export type Config = {
    classifyModel: string;
    configDirectory: string;
    overrides: any;
    model: string;
    debug: boolean;
};

export const create = createSentryPhaseNode({
    phaseName: BILL_SENTRY_PHASE_NAME,
    phaseNodeName: BILL_SENTRY_PHASE_NODE_NAME,
    outputKey: 'bills',
    schema: BillsSchema,
    promptFunctionName: 'createBillSentryPrompt',
}); 
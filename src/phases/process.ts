import { Process, Context as ProcessContext, createProcess } from '@maxdrellin/xenocline';
import * as dreadcabinet from '@theunwalked/dreadcabinet';
import { EmlContent } from '@vortiq/eml-parse-js';
import { z } from 'zod';
import { Config } from '../types';
import { CLASSIFY_PHASE_NODE_NAME, ClassifyPhaseNode, create as createClassifyNode } from './classify';
import { FILTER_PHASE_NODE_NAME, FilterPhaseNode, create as createFilterNode } from './filter';
import { LOCATE_PHASE_NODE_NAME, LocatePhaseNode, create as createLocateNode } from './locate';
import { RECEIPT_PHASE_NODE_NAME, ReceiptPhaseNode, create as createReceiptNode } from './receipt';
import { SENTRY_AGGREGATOR_NODE_NAME, SentryAggregatorNode, create as createSentryAggregatorNode } from './sentry/aggregator';
import { EVENT_SENTRY_PHASE_NODE_NAME, EventSentryPhaseNode, create as createEventSentryNode } from './sentry/event';
import { PERSON_SENTRY_PHASE_NODE_NAME, PersonSentryPhaseNode, create as createPersonSentryNode } from './sentry/person';
import { RECEIPT_SENTRY_PHASE_NODE_NAME, ReceiptSentryPhaseNode, create as createReceiptSentryNode } from './sentry/receipt';
import { SIMPLIFY_PHASE_NODE_NAME, SimplifyPhaseNode, create as createSimplifyNode } from './simplify';
import { SUMMARIZE_PHASE_NODE_NAME, SummarizePhaseNode, create as createSummarizeNode } from './summarize';

export const PROCESS_NAME = 'Process';

export const ClassificationSchema = z.object({
    coordinate: z.array(z.string()),
    strength: z.number(),
    reason: z.string(),
});

export const ClassificationsSchema = z.array(ClassificationSchema);

export type Classification = z.infer<typeof ClassificationSchema>;
export type Classifications = z.infer<typeof ClassificationsSchema>;

export const EventSchema = z.object({
    name: z.string(),
    date: z.string(),
    time: z.string(),
    eventType: z.enum(['appointment', 'deadline', 'meeting', 'other']),
    dateType: z.enum(['exact', 'approximate', 'range']),
    location: z.string(),
    description: z.string(),
    category: z.string(),
    reason: z.string(),
});

export const EventsSchema = z.array(EventSchema);

export type Event = z.infer<typeof EventSchema>;
export type Events = z.infer<typeof EventsSchema>;

export const PersonSchema = z.object({
    name: z.string(),
    role: z.string(),
    category: z.enum(['family', 'friend', 'work', 'project', 'other']),
    reason: z.string(),
});

export const PeopleSchema = z.array(PersonSchema);

export type Person = z.infer<typeof PersonSchema>;
export type People = z.infer<typeof PeopleSchema>;

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

export interface Context extends ProcessContext {
    //  These are the values that are created by the Create phase
    file?: string;

    // These are created by the locate phase
    creationTime?: Date;
    outputPath?: string;
    contextPath?: string;
    detailPath?: string;
    hash?: string;
    filename?: string;
    eml?: EmlContent | null; // Allow null for initial state

    // These are created by the filter phase
    include?: boolean;

    // These are created by the classify phase
    classifications?: Classifications;
    events?: Events;
    people?: People;

}

export interface ClassifiedTranscription {
    text: string;
    type: string;
    subject: string;
}


export const create = async (config: Config, operator: dreadcabinet.Operator): Promise<Process> => {
    const locateNode: LocatePhaseNode = await createLocateNode(config, operator);
    const simplifyNode: SimplifyPhaseNode = await createSimplifyNode(config);
    const filterNode: FilterPhaseNode = await createFilterNode(config);
    const classifyNode: ClassifyPhaseNode = await createClassifyNode(config);
    const eventSentryNode: EventSentryPhaseNode = await createEventSentryNode(config);
    const personSentryNode: PersonSentryPhaseNode = await createPersonSentryNode(config);
    const receiptSentryNode: ReceiptSentryPhaseNode = await createReceiptSentryNode(config);
    const summarizeNode: SummarizePhaseNode = await createSummarizeNode(config);
    const receiptNode: ReceiptPhaseNode = await createReceiptNode(config);
    const sentryAggregatorNode: SentryAggregatorNode = await createSentryAggregatorNode();


    const process: Process = createProcess(PROCESS_NAME, {
        phases: {
            [LOCATE_PHASE_NODE_NAME]: locateNode,
            [SIMPLIFY_PHASE_NODE_NAME]: simplifyNode,
            [FILTER_PHASE_NODE_NAME]: filterNode,
            [CLASSIFY_PHASE_NODE_NAME]: classifyNode,
            [EVENT_SENTRY_PHASE_NODE_NAME]: eventSentryNode,
            [PERSON_SENTRY_PHASE_NODE_NAME]: personSentryNode,
            [RECEIPT_SENTRY_PHASE_NODE_NAME]: receiptSentryNode,
            [SENTRY_AGGREGATOR_NODE_NAME]: sentryAggregatorNode,
            [RECEIPT_PHASE_NODE_NAME]: receiptNode,
            [SUMMARIZE_PHASE_NODE_NAME]: summarizeNode,
        } as any,
    });

    return process;

}
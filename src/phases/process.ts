import { Process, Context as ProcessContext, createProcess } from '@maxdrellin/xenocline';
import * as dreadcabinet from '@theunwalked/dreadcabinet';
import { EmlContent } from '@vortiq/eml-parse-js';
import { Config } from '../types';
import { BILL_PHASE_NODE_NAME, BillPhaseNode, create as createBillNode } from './bill';
import { CLASSIFY_PHASE_NODE_NAME, Classifications, ClassifyPhaseNode, create as createClassifyNode } from './classify';
import { FILTER_PHASE_NODE_NAME, FilterPhaseNode, create as createFilterNode } from './filter';
import { LOCATE_PHASE_NODE_NAME, LocatePhaseNode, create as createLocateNode } from './locate';
import { RECEIPT_PHASE_NODE_NAME, ReceiptPhaseNode, create as createReceiptNode } from './receipt';
import { SENTRY_AGGREGATOR_NODE_NAME, SentryAggregatorNode, create as createSentryAggregatorNode } from './sentry/aggregator';
import { BILL_SENTRY_PHASE_NODE_NAME, BillSentryPhaseNode, Bills, create as createBillSentryNode } from './sentry/bill';
import { EVENT_SENTRY_PHASE_NODE_NAME, EventSentryPhaseNode, Events, create as createEventSentryNode } from './sentry/event';
import { PERSON_SENTRY_PHASE_NODE_NAME, People, PersonSentryPhaseNode, create as createPersonSentryNode } from './sentry/person';
import { RECEIPT_SENTRY_PHASE_NODE_NAME, ReceiptSentryPhaseNode, Transactions, create as createReceiptSentryNode } from './sentry/receipt';
import { SIMPLIFY_PHASE_NODE_NAME, SimplifyPhaseNode, create as createSimplifyNode } from './simplify';
import { SUMMARIZE_PHASE_NODE_NAME, SummarizePhaseNode, create as createSummarizeNode } from './summarize';

export const PROCESS_NAME = 'Process';

export interface Context extends ProcessContext {
    //  These are the values that are created by the Create phase
    file?: string;

    // These are created by the locate phase
    creationTime?: Date;
    outputPath?: string;
    contextPath?: string;
    hash?: string;
    filename?: string;
    eml?: EmlContent | null; // Allow null for initial state

    // These are created by the filter phase
    include?: boolean;

    // These are created by the classify phase
    classifications?: Classifications;
    events?: Events;
    people?: People;
    bills?: Bills;
    transactions?: Transactions;
    summary?: string;
    receipt?: string;
    bill?: string;
}

export interface ClassifiedTranscription {
    text: string;
    type: string;
    subject: string;
}


export const create = async (config: Config, operator: dreadcabinet.Operator): Promise<Process> => {
    const locateNode: LocatePhaseNode = await createLocateNode(config, operator);
    const filterNode: FilterPhaseNode = await createFilterNode(config);
    const simplifyNode: SimplifyPhaseNode = await createSimplifyNode(config);
    const classifyNode: ClassifyPhaseNode = await createClassifyNode(config);
    const eventSentryNode: EventSentryPhaseNode = await createEventSentryNode(config);
    const personSentryNode: PersonSentryPhaseNode = await createPersonSentryNode(config);
    const receiptSentryNode: ReceiptSentryPhaseNode = await createReceiptSentryNode(config);
    const summarizeNode: SummarizePhaseNode = await createSummarizeNode(config);
    const receiptNode: ReceiptPhaseNode = await createReceiptNode(config);
    const sentryAggregatorNode: SentryAggregatorNode = await createSentryAggregatorNode();
    const billSentryNode: BillSentryPhaseNode = await createBillSentryNode(config);
    const billNode: BillPhaseNode = await createBillNode(config);


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
            [BILL_SENTRY_PHASE_NODE_NAME]: billSentryNode,
            [BILL_PHASE_NODE_NAME]: billNode,
        } as any,
    });

    return process;

}
import { AggregationResult, Aggregator, AggregatorNode, Connection, Context, createAggregator, createAggregatorNode, createConnection, createDecision, Input as PhaseInput, Output as PhaseOutput, Termination } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { RECEIPT_PHASE_NODE_NAME } from '../receipt';
import { SUMMARIZE_PHASE_NODE_NAME } from '../summarize';
import { getLogger } from '../../logging';
import { Config as ZanalyzeConfig } from '../../types';
import { BILL_PHASE_NODE_NAME } from '../bill';
import { Classifications } from '../classify';
import { Events } from './event';
import { People } from './person';
import { Transactions } from './receipt';
import { Bills } from './bill';


export const SENTRY_AGGREGATOR_NAME = 'sentry_aggregator';
export const SENTRY_AGGREGATOR_NODE_NAME = 'sentry_aggregator_node';
export const SENTRY_DECISION_NAME = 'sentry_decision';

export interface Input extends PhaseInput {
    eml: EmlContent;
    outputPath: string;
    hash: string;
    filename: string;
    contextPath: string;
    classifications: Classifications;
    events: Events;
    people: People;
    transactions: Transactions;
    bills: Bills;
};

export interface Output extends PhaseOutput {
    eml: EmlContent;
    outputPath: string;
    hash: string;
    filename: string;
    contextPath: string;
    classifications: Classifications;
    events: Events;
    people: People;
    transactions: Transactions;
    bills: Bills;
};

export interface SentryAggregator extends Aggregator<Output, Context> {
    aggregate: (input: PhaseInput, context: Context) => Promise<Readonly<AggregationResult<Output>>>;
}

export interface SentryAggregatorNode extends AggregatorNode<Output, Context> {
    aggregator: SentryAggregator;
}

export type Config = Pick<ZanalyzeConfig, 'classifyModel' | 'configDirectory' | 'overrides' | 'model' | 'debug'>;

export const create = async (): Promise<SentryAggregatorNode> => {
    const logger = getLogger();

    const aggregate = async (input: PhaseInput, context: Context): Promise<Readonly<AggregationResult<Output>>> => {

        logger.debug('Context: %s', context);

        const output = {
            ...context,
            ...input,
        };

        logger.debug('Aggregating summarize phase');
        logger.debug('Output: %s', output);

        let result: AggregationResult<PhaseOutput> = {
            status: 'NotYetReady',
        };

        if (output.events && output.people && output.classifications && output.transactions && output.bills) {
            result = {
                status: 'Ready',
                output: output,
            }
        }

        logger.debug('Result: %s', result);

        return result as Readonly<AggregationResult<Output>>;
    }

    const aggregator: SentryAggregator = createAggregator<Output, Context>(
        SENTRY_AGGREGATOR_NAME,
        {
            aggregate,
        }
    );


    const decide = async (output: Output, context: Context): Promise<Termination<Output, Context> | Connection<Output, Context>[]> => {
        const fullContext = {
            ...context,
            ...output,
        };

        const toReceipt = createConnection('toReceipt', RECEIPT_PHASE_NODE_NAME);
        const toSummarize = createConnection('toSummarize', SUMMARIZE_PHASE_NODE_NAME);
        const toBill = createConnection('toBill', BILL_PHASE_NODE_NAME);

        if (fullContext.bills.length > 0) {
            return [toBill];
        } else if (fullContext.transactions.length > 0) {
            return [toReceipt];
        } else {
            return [toSummarize];
        }
    }


    const decision = createDecision(
        SENTRY_DECISION_NAME,
        decide,
    );



    const aggregatorNode = createAggregatorNode<Output, Context>(
        SENTRY_AGGREGATOR_NODE_NAME,
        aggregator,
        {
            next: [decision],
        }
    );

    return aggregatorNode;
}





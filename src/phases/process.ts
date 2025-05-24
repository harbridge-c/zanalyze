import * as dreadcabinet from '@theunwalked/dreadcabinet';
import { EmlContent } from '@vortiq/eml-parse-js';
import { createProcess, Process, Context as ProcessContext } from '@maxdrellin/xenocline';
import { z } from 'zod';
import { Config } from '../types';
import { CLASSIFY_PHASE_NODE_NAME, ClassifyPhaseNode, create as createClassifyNode } from './classify';
import { FILTER_PHASE_NODE_NAME, FilterPhaseNode, create as createFilterNode } from './filter';
import { LOCATE_PHASE_NODE_NAME, LocatePhaseNode, create as createLocateNode } from './locate';
import { SIMPLIFY_PHASE_NODE_NAME, SimplifyPhaseNode, create as createSimplifyNode } from './simplify';

export const PROCESS_NAME = 'Process';

export const ClassificationSchema = z.object({
    coordinate: z.array(z.string()),
    strength: z.number(),
    reason: z.string(),
});

export const ClassificationsSchema = z.array(ClassificationSchema);

export type Classification = z.infer<typeof ClassificationSchema>;
export type Classifications = z.infer<typeof ClassificationsSchema>;

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

    const process: Process = createProcess(PROCESS_NAME, {
        phases: {
            [LOCATE_PHASE_NODE_NAME]: locateNode,
            [SIMPLIFY_PHASE_NODE_NAME]: simplifyNode,
            [FILTER_PHASE_NODE_NAME]: filterNode,
            [CLASSIFY_PHASE_NODE_NAME]: classifyNode,
        } as any,
    });

    return process;

}
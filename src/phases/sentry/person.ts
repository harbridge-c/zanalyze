import { Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { z } from 'zod';
import { Classifications } from '../classify';
import { createSentryPhaseNode } from './sentryPhaseFactory';

export const PERSON_SENTRY_PHASE_NAME = 'person_sentry';
export const PERSON_SENTRY_PHASE_NODE_NAME = 'person_sentry_node';

// Person schema and types
export const PersonSchema = z.object({
    name: z.string(),
    role: z.string(),
    category: z.enum(['family', 'friend', 'work', 'project', 'other']),
    reason: z.string(),
});

export const PeopleSchema = z.array(PersonSchema);

export type Person = z.infer<typeof PersonSchema>;
export type People = z.infer<typeof PeopleSchema>;

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
    people: People;
};

export type PersonSentryPhaseNode = PhaseNode<Input, Output>;

export type Config = {
    classifyModel: string;
    configDirectory: string;
    overrides: any;
    model: string;
    debug: boolean;
};

export const create = createSentryPhaseNode({
    phaseName: PERSON_SENTRY_PHASE_NAME,
    phaseNodeName: PERSON_SENTRY_PHASE_NODE_NAME,
    outputKey: 'people',
    schema: PeopleSchema,
    promptFunctionName: 'createPersonSentryPrompt',
});





import { Input as PhaseInput, PhaseNode, Output as PhaseOutput } from '@maxdrellin/xenocline';
import { EmlContent } from '@vortiq/eml-parse-js';
import { z } from 'zod';
import { Classifications } from '../classify';
import { createSentryPhaseNode } from './sentryPhaseFactory';

export const EVENT_SENTRY_PHASE_NAME = 'event_sentry';
export const EVENT_SENTRY_PHASE_NODE_NAME = 'event_sentry_node';

// Event schema and types moved from process.ts
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
    events: Events;
};

export type EventSentryPhaseNode = PhaseNode<Input, Output>;

export type Config = {
    classifyModel: string;
    configDirectory: string;
    overrides: any;
    model: string;
    debug: boolean;
};

export const create = createSentryPhaseNode({
    phaseName: EVENT_SENTRY_PHASE_NAME,
    phaseNodeName: EVENT_SENTRY_PHASE_NODE_NAME,
    outputKey: 'events',
    schema: EventsSchema,
    promptFunctionName: 'createEventSentryPrompt',
});





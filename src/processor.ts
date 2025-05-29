import * as Logging from './logging';
//import * as ClassifyPhase from './phases/classify';
// import * as TranscribePhase from './phases/transcribe';
// import * as ComposePhase from './phases/compose';
import * as LocatePhase from './phases/locate';
// import * as CompletePhase from './phases/complete';
import * as dreadcabinet from '@theunwalked/dreadcabinet';
import * as Process from './phases/process';
import { Config } from './types';
import * as Storage from './util/storage';

import { Context, createBeginning, createEventFilter, createEventHandler, createFilteredHandler, Event, EventHandler, executeProcess, NodeEvent } from '@maxdrellin/xenocline';
import path from 'path';
import { Logger } from 'winston';
import { DEFAULT_CHARACTER_ENCODING } from './constants';

export interface Instance {
    process(file: string): Promise<void>;
}

function nodeProcessedHandler(logger: Logger, storage: Storage.Utility) {
    const nodeProcessedFilter = createEventFilter(["node"], ["processed"]);
    const nodeProcessedHandler = createEventHandler<NodeEvent<any, any, any, any>, Context>(async (
        event: NodeEvent<any, any, any, any>,
        context: Context
    ) => {
        if (context.contextPath && context.filename && context.include === true) {
            const contextFile = path.join(context.contextPath as string, `${context.filename}.json`);
            await storage.writeFile(contextFile, JSON.stringify(context, null, 2), DEFAULT_CHARACTER_ENCODING);
        };
    });

    const handleNodeProcessedFilter = createFilteredHandler<NodeEvent<any, any, any, any>, Context>(nodeProcessedFilter, {
        handler: nodeProcessedHandler,
    });
    return handleNodeProcessedFilter;
}

// Helper function to promisify ffmpeg.
export const create = async (config: Config, operator: dreadcabinet.Operator): Promise<Instance> => {
    const logger = Logging.getLogger();
    const storage = Storage.create({ log: logger.debug });

    const process = async (file: string) => {

        const input: LocatePhase.Input = {
            file: file,
        };

        const process = await Process.create(config, operator);
        const beginning = createBeginning('start', LocatePhase.LOCATE_PHASE_NODE_NAME);

        const handleNodeProcessedFilter = nodeProcessedHandler(logger, storage);

        await executeProcess(process, beginning, {
            input,
            eventHandlers: [
                handleNodeProcessedFilter as unknown as EventHandler<Event, Context>,
            ],
        });
    }

    return {
        process,
    }
}




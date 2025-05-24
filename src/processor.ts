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

import { createBeginning, executeProcess } from '@maxdrellin/xenocline';
import { DEFAULT_CHARACTER_ENCODING } from './constants';

export interface Instance {
    process(file: string): Promise<void>;
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
        const results = await executeProcess(process, beginning, {
            input,
        });
        await storage.writeFile('./yop.json', JSON.stringify(results, null, 2), DEFAULT_CHARACTER_ENCODING);
    }

    return {
        process,
    }
}



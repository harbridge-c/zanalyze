import * as dreadcabinet from '@theunwalked/dreadcabinet';
import { EmlContent } from '@vortiq/eml-parse-js';
import { Context, createConnection, createPhase, createPhaseNode, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod } from '@maxdrellin/xenocline';
import path from 'path';
import * as Logging from '../logging';
import { Config } from '../types';
import { fromEml } from '../util/email';
import * as Storage from '../util/storage';
import { SIMPLIFY_PHASE_NODE_NAME, Input as SimplifyPhaseInput } from './simplify';

export const LOCATE_PHASE_NODE_NAME = 'locate_node';
export const LOCATE_PHASE_NAME = 'locate';
export const TO_SIMPLIFY_CONNECTION_NAME = 'toSimplify';

// The locate phase might get the whole context, but, from a type perspective, it only needs the file
export interface Input extends PhaseInput {
    file: string;
}

// The locate phase creates the creationTime, outputPath, and hash
export interface Output extends PhaseOutput {
    creationTime: Date;
    outputPath: string;
    contextPath: string;
    hash: string;
    eml: EmlContent;
    filename: string;
}

export type LocatePhase = Phase<Input, Output>;
export type LocatePhaseNode = PhaseNode<Input, Output>;

export const create = async (config: Config, operator: dreadcabinet.Operator): Promise<LocatePhaseNode> => {
    const logger = Logging.getLogger();
    const storage = Storage.create({ log: logger.debug });


    const execute = async (input: Input): Promise<Output> => {
        logger.debug('Processing file %s', input.file);

        const content = await storage.readFile(input.file, 'utf8');

        const eml = fromEml(content);
        const date: Date = eml.date;

        // Calculate the hash of file and output directory
        const hash = (await storage.hashFile(input.file, 100)).substring(0, 8);
        const outputPath: string = await operator.constructOutputDirectory(date);
        const contextPath: string = path.join(outputPath, '.context');
        await storage.createDirectory(contextPath);
        const safeSubject = eml.subject ? eml.subject.substring(0, 12).replace(/[^a-zA-Z0-9-_]/g, '_') : '';
        const filename: string = await operator.constructFilename(date, 'output', hash, { subject: safeSubject });
        return {
            creationTime: date,
            outputPath,
            contextPath,
            hash,
            filename,
            eml,
        };
    }


    const transform = async (output: Output, context: Context): Promise<[SimplifyPhaseInput, Context]> => {
        context = {
            ...context,
            creationTime: output.creationTime,
            outputPath: output.outputPath,
            contextPath: output.contextPath,
            detailPath: output.detailPath,
            hash: output.hash,
            filename: output.filename,
            eml: output.eml,
        };

        // TODO: Figure out a better way to handle errors during transformation...
        if (!context.eml) {
            throw new Error('eml is required for simplify phase');
        }
        return [
            {
                eml: context.eml as EmlContent,
            },
            context,
        ];
    }

    const phase = createPhase(LOCATE_PHASE_NAME, { execute });
    const connection = createConnection(TO_SIMPLIFY_CONNECTION_NAME, SIMPLIFY_PHASE_NODE_NAME, { transform });

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    return createPhaseNode(LOCATE_PHASE_NODE_NAME, phase, {
        next: [connection],
        process,
    });
}

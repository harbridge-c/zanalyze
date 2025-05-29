import { Connection, Context, createConnection, createDecision, createPhase, createPhaseNode, createTermination, Decision, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod, Termination } from '@maxdrellin/xenocline';
import * as dreadcabinet from '@theunwalked/dreadcabinet';
import { EmlContent } from '@vortiq/eml-parse-js';
import path from 'path';
import * as Logging from '../logging';
import { Config } from '../types';
import { fromEml } from '../util/email';
import * as Storage from '../util/storage';
import { FILTER_PHASE_NODE_NAME } from './filter';
import { Input as FilterPhaseInput } from './filter';

export const LOCATE_PHASE_NODE_NAME = 'locate_node';
export const LOCATE_PHASE_NAME = 'locate';
export const TO_CHECK_EXISTING_CONNECTION_NAME = 'toCheckExisting';
export const CHECK_EXISTING_DECISION_NAME = 'check_existing';
export const SKIP_CONNECTION_NAME = 'skip_existing';

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

type CheckExistingDecision = Decision<Output, Context>;

export const createCheckExistingDecision = async (): Promise<CheckExistingDecision> => {
    const logger = Logging.getLogger();
    const storage = Storage.create({ log: logger.debug });

    const decide = async (output: Output): Promise<Termination<Output, Context> | Connection<Output, Context>[]> => {
        // Construct the context file path
        const contextFile = path.join(output.contextPath, `${output.filename}.json`);

        // Check if the file exists
        const exists = await storage.exists(contextFile);

        if (exists) {
            logger.info(`Context file already exists for ${output.filename}, skipping...`);
            // Return a termination to skip this file
            return createTermination<Output, Context>(SKIP_CONNECTION_NAME);
        }

        // File doesn't exist, continue to filter phase
        logger.debug(`Context file does not exist for ${output.filename}, proceeding to filter...`);

        // Transform function for the connection
        const transform = async (output: Output, context: Context): Promise<[FilterPhaseInput, Context]> => {
            context = {
                ...context,
                creationTime: output.creationTime,
                outputPath: output.outputPath,
                contextPath: output.contextPath,
                hash: output.hash,
                filename: output.filename,
                eml: output.eml,
            };

            if (!context.eml) {
                throw new Error('eml is required for filter phase');
            }

            return [
                {
                    eml: context.eml as EmlContent,
                },
                context,
            ];
        };

        // Return connection to filter phase
        const connection = createConnection('to_filter_from_decision', FILTER_PHASE_NODE_NAME, { transform });
        return [connection];
    };

    return createDecision(CHECK_EXISTING_DECISION_NAME, decide);
};

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

    const phase = createPhase(LOCATE_PHASE_NAME, { execute });
    const checkExistingDecision = await createCheckExistingDecision();

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    return createPhaseNode(LOCATE_PHASE_NODE_NAME, phase, {
        next: [checkExistingDecision],
        process,
    });
}

import { EmailAddress, EmlContent } from '@vortiq/eml-parse-js';
import { Connection, Context, createConnection, createDecision, createPhase, createPhaseNode, createTermination, Phase, Input as PhaseInput, PhaseNode, Output as PhaseOutput, ProcessMethod, Termination, VerifyMethodResponse } from '@maxdrellin/xenocline';
import { getLogger } from '../logging';
import { Config as ZanalyzeConfig } from '../types';
import { Input as SimplifyPhaseInput, SIMPLIFY_PHASE_NODE_NAME } from './simplify';

export const FILTER_PHASE_NAME = 'filter';
export const FILTER_PHASE_NODE_NAME = 'filter_node';
export const FILTER_DECISION_NAME = 'filterDecision';


export type Config = Pick<ZanalyzeConfig, 'filters'>;

export interface Input extends PhaseInput {
    eml: EmlContent;
}

export interface Output extends PhaseOutput {
    include: boolean;
    includeReason: string;
}

export type FilterPhase = Phase<Input, Output>;
export type FilterPhaseNode = PhaseNode<Input, Output>;

export const create = async (config: Config): Promise<FilterPhaseNode> => {
    const logger = getLogger();

    const verify = async (input: Input): Promise<VerifyMethodResponse> => {
        const response: VerifyMethodResponse = {
            verified: true,
            messages: [],
        };

        if (!input.eml) {
            logger.error('eml is required for filter function');
            response.verified = false;
            response.messages.push('eml is required for filter function');
        }

        return response;
    }

    const execute = async (input: Input): Promise<Output> => {

        let include = true;
        let includeReason = 'Default Include';

        if (!config.filters) {
            return {
                include,
                includeReason,
            };
        } else {


            if (config.filters?.include) {
                logger.debug('Processing Include Filters...');
                logger.debug('Since the include filters are defined, setting default for include result to false.');
                include = false;
                includeReason = 'Default Include set to False since include filters are defined';

                const subjectFilters = config.filters?.include.subject?.map(subject => new RegExp(subject, 'i'));
                const toFilters = config.filters?.include.to?.map(to => new RegExp(to, 'i'));
                const fromFilters = config.filters?.include.from?.map(from => new RegExp(from, 'i'));

                if (subjectFilters && input.eml.subject && subjectFilters.some((filter: RegExp) => filter.test(input.eml.subject))) {
                    logger.verbose(`Including email with subject: ${input.eml.subject}`);
                    include = true;
                    includeReason = `Include filter matched subject: ${input.eml.subject}`;
                }

                if (toFilters && input.eml.to && toFilters.some((filter: RegExp) => input.eml.to.some((to: EmailAddress) => filter.test(to.email)))) {
                    logger.verbose(`Including email with to email: ${input.eml.to.map((to: EmailAddress) => to.email).join(', ')}`);
                    include = true;
                    includeReason = `Include filter matched to email: ${input.eml.to.map((to: EmailAddress) => to.email).join(', ')}`;
                }

                if (toFilters && input.eml.to && toFilters.some((filter: RegExp) => input.eml.to.some((to: EmailAddress) => filter.test(to.name)))) {
                    logger.verbose(`Including email with to name: ${input.eml.to.map((to: EmailAddress) => to.name).join(', ')}`);
                    include = true;
                    includeReason = `Include filter matched to name: ${input.eml.to.map((to: EmailAddress) => to.name).join(', ')}`;
                }

                if (fromFilters && input.eml.from && fromFilters.some((filter: RegExp) => input.eml.from.some((from: EmailAddress) => filter.test(from.email)))) {
                    logger.verbose(`Including email with from email: ${input.eml.from.map((from: EmailAddress) => from.email).join(', ')}`);
                    include = true;
                    includeReason = `Include filter matched from email: ${input.eml.from.map((from: EmailAddress) => from.email).join(', ')}`;
                }

                if (fromFilters && input.eml.from && fromFilters.some((filter: RegExp) => input.eml.from.some((from: EmailAddress) => filter.test(from.name)))) {
                    logger.verbose(`Including email with from name: ${input.eml.from.map((from: EmailAddress) => from.name).join(', ')}`);
                    include = true;
                    includeReason = `Include filter matched from name: ${input.eml.from.map((from: EmailAddress) => from.name).join(', ')}`;
                }


            }

            if (config.filters?.exclude) {
                logger.debug('Processing Exclude Filters...');
                const subjectFilters = config.filters?.exclude.subject?.map(subject => new RegExp(subject, 'i'));
                const toFilters = config.filters?.exclude.to?.map(to => new RegExp(to, 'i'));
                const fromFilters = config.filters?.exclude.from?.map(from => new RegExp(from, 'i'));

                if (subjectFilters && input.eml.subject && subjectFilters.some((filter: RegExp) => filter.test(input.eml.subject))) {
                    logger.verbose(`Filtering out email with subject: ${input.eml.subject}`);
                    include = false;
                    includeReason = `Exclude filter matched subject: ${input.eml.subject}`;
                }

                if (toFilters && input.eml.to && toFilters.some((filter: RegExp) => input.eml.to.some((to: EmailAddress) => filter.test(to.email)))) {
                    logger.verbose(`Filtering out email with to email: ${input.eml.to.map((to: EmailAddress) => to.email).join(', ')}`);
                    include = false;
                    includeReason = `Exclude filter matched to email: ${input.eml.to.map((to: EmailAddress) => to.email).join(', ')}`;
                }

                if (toFilters && input.eml.to && toFilters.some((filter: RegExp) => input.eml.to.some((to: EmailAddress) => filter.test(to.name)))) {
                    logger.verbose(`Filtering out email with to name: ${input.eml.to.map((to: EmailAddress) => to.name).join(', ')}`);
                    include = false;
                    includeReason = `Exclude filter matched to name: ${input.eml.to.map((to: EmailAddress) => to.name).join(', ')}`;
                }

                if (fromFilters && input.eml.from && fromFilters.some((filter: RegExp) => input.eml.from.some((from: EmailAddress) => filter.test(from.email)))) {
                    logger.verbose(`Filtering out email with from email: ${input.eml.from.map((from: EmailAddress) => from.email).join(', ')}`);
                    include = false;
                    includeReason = `Exclude filter matched from email: ${input.eml.from.map((from: EmailAddress) => from.email).join(', ')}`;
                }

                if (fromFilters && input.eml.from && fromFilters.some((filter: RegExp) => input.eml.from.some((from: EmailAddress) => filter.test(from.name)))) {
                    logger.verbose(`Filtering out email with from name: ${input.eml.from.map((from: EmailAddress) => from.name).join(', ')}`);
                    include = false;
                    includeReason = `Exclude filter matched from name: ${input.eml.from.map((from: EmailAddress) => from.name).join(', ')}`;
                }
            }

        }

        return {
            include,
            includeReason,
        };
    }

    const transform = async (output: Output, context: Context): Promise<[SimplifyPhaseInput, Context]> => {
        context = {
            ...context,
            include: output.include,
            includeReason: output.includeReason,
        };

        return [
            {
                eml: context.eml as EmlContent,
                outputPath: context.outputPath as string,
                hash: context.hash as string,
                filename: context.filename as string,
                contextPath: context.contextPath as string,
            },
            context,
        ];
    }

    const decide = async (output: Output): Promise<Termination<Output, Context> | Connection<Output, Context>[]> => {
        const connection = createConnection('toClassify', SIMPLIFY_PHASE_NODE_NAME, { transform });
        if (output.include) {
            return [connection];
        } else {
            const termination = createTermination('filtered');
            return termination;
        }
    }

    const phase = createPhase(FILTER_PHASE_NAME, { execute, verify });
    const decision = createDecision(FILTER_DECISION_NAME, decide);

    const process: ProcessMethod<Output, Context> = async (output: Output, context: Context) => {
        const processedContext = {
            ...context,
            ...output,
        };

        return [output, processedContext];
    }

    return createPhaseNode(FILTER_PHASE_NODE_NAME, phase, {
        next: [decision],
        process,
    });
}

import * as DreadCabinet from "@theunwalked/dreadcabinet";
import * as CardiganTime from '@theunwalked/cardigantime';
import { Command } from "commander";
import { ALLOWED_MODELS, CRUDZAP_DEFAULTS, DEFAULT_CONTEXT_DIRECTORY, DEFAULT_DEBUG, DEFAULT_DRY_RUN, DEFAULT_MODEL, DEFAULT_REPLACE, DEFAULT_SILLY, DEFAULT_VERBOSE, PROGRAM_NAME, VERSION } from "./constants";
import { getLogger, setLogLevel } from "./logging";
import { Args, CombinedArgs, Config, DateRange, JobArgs, JobConfig } from "./types";
import * as Dates from "./util/dates";
import * as Storage from "./util/storage";
import { deepmerge } from 'deepmerge-ts';

function clean(obj: any) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
}

export const configure = async (dreadcabinet: DreadCabinet.DreadCabinet, cardigantime: CardiganTime.Cardigantime<any>): Promise<[Config, DateRange]> => {
    let logger = getLogger();
    let program = new Command();

    program
        .name(PROGRAM_NAME)
        .summary('Simplify and remove the Crud from EML files')
        .description('Simplify and remove the Crud from EML files')
        .option('--current-month', 'export emails from the first day of the current month to today, cannot be used together with either --start or --end options')
        .option('--dry-run', `perform a dry run without saving files (Default: ${DEFAULT_DRY_RUN})`)
        .option('--verbose', `enable verbose logging (Default: ${DEFAULT_VERBOSE})`)
        .option('--debug', `enable debug logging (Default: ${DEFAULT_DEBUG})`)
        .option('--silly', `enable silly logging (Default: ${DEFAULT_SILLY})`)
        .option('--model <model>', `OpenAI model to use (Default: ${DEFAULT_MODEL})`)
        .option('--context-directories [contextDirectories...]', `directory containing context files to be included in prompts (Default: ${DEFAULT_CONTEXT_DIRECTORY})`)
        .option('--replace', `replace existing summary files if they exist (Default: ${DEFAULT_REPLACE})`)
        .version(VERSION);

    await dreadcabinet.configure(program);
    program = await cardigantime.configure(program);
    program.parse();


    const cliCombinedArgs: CombinedArgs = program.opts<CombinedArgs>();

    logger.debug('Loaded Command Line Options: %s',
        '\n\n' + JSON.stringify(cliCombinedArgs, null, 2).replace(/^/gm, '    ') + '\n\n');

    const cliArgs: Args = {
        config: cliCombinedArgs.config,
        verbose: cliCombinedArgs.verbose,
        debug: cliCombinedArgs.debug,
        silly: cliCombinedArgs.silly,
        dryRun: cliCombinedArgs.dryRun,
        limit: cliCombinedArgs.limit,
        model: cliCombinedArgs.model,
        overrides: cliCombinedArgs.overrides,
        contextDirectories: cliCombinedArgs.contextDirectories,
        replace: cliCombinedArgs.replace,
        inputDirectory: cliCombinedArgs.inputDirectory,
        inputStructure: cliCombinedArgs.inputStructure,
        inputFilenameOptions: cliCombinedArgs.inputFilenameOptions,
        outputDirectory: cliCombinedArgs.outputDirectory,
        outputStructure: cliCombinedArgs.outputStructure,
        outputFilenameOptions: cliCombinedArgs.outputFilenameOptions,
        recursive: cliCombinedArgs.recursive,
        timezone: cliCombinedArgs.timezone,
        extensions: cliCombinedArgs.extensions,
    } as Args;

    if (cliCombinedArgs.debug) {
        setLogLevel('debug');
        logger = getLogger();
    }

    const cliJobArgs: JobArgs = {
        currentMonth: cliCombinedArgs.currentMonth,
        start: cliCombinedArgs.start,
        end: cliCombinedArgs.end,
    };

    // Get values from config file first
    // Validate that the configuration read from the file is valid.
    const fileValues = await cardigantime.read(cliCombinedArgs);
    await cardigantime.validate(fileValues);

    // Read the Raw values from the dreadcabinet Command Line Arguments
    const dreadcabinetValues = await dreadcabinet.read(cliArgs);

    let crudzapConfig: Config = deepmerge(
        CRUDZAP_DEFAULTS,
        fileValues,   // Apply file values (overwrites defaults)
        dreadcabinetValues,
        clean(cliArgs) // Apply all CLI args last (highest precedence)
    ) as Config;
    await validateCrudzapConfig(crudzapConfig);
    logger.debug('Crudzap config: %s',
        '\n\n' + JSON.stringify(crudzapConfig, null, 2).replace(/^/gm, '    ') + '\n\n');

    const jobConfig: JobConfig = {
        ...clean(cliJobArgs),
    } as JobConfig;
    await validateJobConfig(jobConfig);
    logger.debug('Job config: %s',
        '\n\n' + JSON.stringify(jobConfig, null, 2).replace(/^/gm, '    ') + '\n\n');

    crudzapConfig = dreadcabinet.applyDefaults(crudzapConfig) as Config;

    const dateRange: DateRange = createDateRange({
        timezone: crudzapConfig.timezone,
        currentMonth: jobConfig.currentMonth ?? false,
        start: jobConfig.start ? new Date(jobConfig.start) : undefined,
        end: jobConfig.end ? new Date(jobConfig.end) : undefined
    });
    logger.debug('Date range: %s',
        '\n\n' + JSON.stringify(dateRange, null, 2).replace(/^/gm, '    ') + '\n\n');

    return [crudzapConfig, dateRange];
}

export const validateJobConfig = async (jobConfig: JobConfig) => {
    if (!jobConfig.start && !jobConfig.end && !jobConfig.currentMonth) {
        throw new Error('You must specify a date range using --start/--end or use --current-month.');
    }

    if (jobConfig.start && isNaN(new Date(jobConfig.start).getTime())) {
        throw new Error(`Invalid start date format: ${jobConfig.start}. Please use YYYY-MM-DD.`);
    }
    if (jobConfig.end && isNaN(new Date(jobConfig.end).getTime())) {
        throw new Error(`Invalid end date format: ${jobConfig.end}. Please use YYYY-MM-DD.`);
    }

    if (jobConfig.currentMonth && (jobConfig.start || jobConfig.end)) {
        throw new Error('currentMonth cannot be used together with either start or end options');
    }
}

async function validateCrudzapConfig(
    config: Config
): Promise<void> {

    if (config.contextDirectories) {
        await validateInputDirectory(config.contextDirectories);
    }

    validateModel(config.model, true, 'model', '--model');
}


function validateModel(model: string | undefined, required: boolean, modelConfigName: string, modelOptionName: string): void {
    if (required && !model) {
        throw new Error(`Model is required either in the config file (${modelConfigName}) or as a command line argument (${modelOptionName})`);
    }

    if (model && !ALLOWED_MODELS.includes(model)) {
        throw new Error(`Invalid model: ${model}. Valid models are: ${ALLOWED_MODELS.join(', ')}`);
    }
}

async function validateInputDirectory(inputDirectories: string[]): Promise<void> {
    const logger = getLogger();
    const storage = Storage.create({ log: logger.info });
    for (const inputDirectory of inputDirectories) {
        if (!storage.isDirectoryReadable(inputDirectory)) {
            throw new Error(`Input directory does not exist: ${inputDirectory}`);
        }
    }
}

function createDateRange({ timezone, currentMonth, start, end }: { timezone: string, currentMonth: boolean, start?: Date, end?: Date }): DateRange {
    let startDate: Date;
    let endDate: Date;

    const dateUtility = Dates.create({ timezone });

    if (currentMonth) {
        const today = dateUtility.now();
        startDate = dateUtility.startOfMonth(today);
        endDate = today;
        getLogger().info(`Using current month date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
        if (end) {
            endDate = dateUtility.date(end);
        } else {
            endDate = dateUtility.now();
            getLogger().info('No end date specified, defaulting to now.');
        }

        if (start) {
            startDate = dateUtility.date(start);
        } else {
            startDate = dateUtility.subDays(endDate, 31);
            getLogger().info('No start date specified, defaulting to 31 days before end date.');
        }
        getLogger().info(`Using specified or default date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    }

    if (dateUtility.isBefore(endDate, startDate)) {
        const errorMsg = `End date (${endDate.toISOString()}) must be on or after start date (${startDate.toISOString()}).`;
        getLogger().error(errorMsg);
        throw new Error(errorMsg);
    }

    return {
        start: startDate,
        end: endDate
    };
}

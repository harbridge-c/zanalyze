import { FilenameOption, FilesystemStructure } from "@theunwalked/dreadcabinet";
import { Config, FiltersConfig, SimplifyConfig } from "./types";
export const VERSION = '__VERSION__ (__GIT_BRANCH__/__GIT_COMMIT__ __GIT_TAGS__ __GIT_COMMIT_DATE__) __SYSTEM_INFO__';
export const PROGRAM_NAME = 'zanalyze';
export const DEFAULT_CHARACTER_ENCODING = 'utf-8';
export const DEFAULT_BINARY_TO_TEXT_ENCODING = 'base64';
export const DEFAULT_CONFIGURATION_DIRECTORY = `.${PROGRAM_NAME}`;
export const DEFAULT_DESTINATION_DIR = './exports';
export const DATE_FORMAT_MONTH_DAY = 'MM-DD';
export const DATE_FORMAT_YEAR = 'YYYY';
export const DATE_FORMAT_YEAR_MONTH = 'YYYY-MM';
export const DATE_FORMAT_YEAR_MONTH_DAY = 'YYYY-MM-DD';
export const DATE_FORMAT_YEAR_MONTH_DAY_SLASH = 'YYYY/MM/DD';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES = 'YYYY-MM-DD-HHmm';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES_SECONDS = 'YYYY-MM-DD-HHmmss';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES_SECONDS_MILLISECONDS = 'YYYY-MM-DD-HHmmss.SSS';
export const DATE_FORMAT_MONTH = 'M';
export const DATE_FORMAT_DAY = 'DD';
export const DATE_FORMAT_HOURS = 'HHmm';
export const DATE_FORMAT_MINUTES = 'mm';
export const DATE_FORMAT_SECONDS = 'ss';
export const DATE_FORMAT_MILLISECONDS = 'SSS';
export const DEFAULT_TIMEZONE = 'Etc/UTC';
export const DEFAULT_VERBOSE = false;
export const DEFAULT_DEBUG = false;
export const DEFAULT_SILLY = false;
export const DEFAULT_DRY_RUN = false;
export const DEFAULT_MODEL = 'gpt-4o';
export const DEFAULT_REPLACE = false;
export const DEFAULT_CONTEXT_DIRECTORY = './context';
export const DEFAULT_INPUT_DIRECTORY = './input';
export const DEFAULT_INPUT_STRUCTURE = 'month' as FilesystemStructure;
export const DEFAULT_INPUT_FILENAME_OPTIONS = ['date', 'subject'] as FilenameOption[];
export const DEFAULT_OUTPUT_DIRECTORY = './output';
export const DEFAULT_OUTPUT_STRUCTURE = 'month' as FilesystemStructure;
export const DEFAULT_OUTPUT_FILENAME_OPTIONS = ['date', 'subject'] as FilenameOption[];


export const ALLOWED_INPUT_STRUCTURES = ['none', 'year', 'month', 'day'] as FilesystemStructure[];
export const ALLOWED_INPUT_FILENAME_OPTIONS = ['date', 'time', 'subject'] as FilenameOption[];
export const ALLOWED_OUTPUT_STRUCTURES = ['none', 'year', 'month', 'day'] as FilesystemStructure[];
export const ALLOWED_OUTPUT_FILENAME_OPTIONS = ['date', 'time', 'subject'] as FilenameOption[];
export const ALLOWED_EMAIL_EXTENSIONS = ['eml'] as string[];

export const DEFAULT_EMAIL_EXTENSIONS = ['eml'] as string[];
export const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini'] as string[];

export const DEFAULT_FILTERS: FiltersConfig = {
    include: {
        subject: [],
        to: [],
        from: [],
    },
    exclude: {
        subject: [],
        to: [],
        from: [],
    },
};

export const DEFAULT_SIMPLIFY: SimplifyConfig = {
    headers: [
        '^GmExport-.*$',
        '^Received-SPF$',
        '^Authentication-Results$',
        '^Date$',
        '^From$',
        '^To$',
        '^Subject$',
        '^Message-ID$',
        '^Reply-To$',
        '^Cc$',
        '^Bcc$',
    ] as string[],
    textOnly: true,
    skipAttachments: true,
};

export const ZANALYZE_DEFAULTS: Config = {
    model: DEFAULT_MODEL,
    verbose: DEFAULT_VERBOSE,
    debug: DEFAULT_DEBUG,
    silly: DEFAULT_SILLY,
    dryRun: DEFAULT_DRY_RUN,
    replace: DEFAULT_REPLACE,
    simplify: DEFAULT_SIMPLIFY,
    filters: DEFAULT_FILTERS,
} as Config;

export const DEFAULT_PERSONAS_DIR = `/personas`;

export const DEFAULT_PERSONA_YOU_FILE = `${DEFAULT_PERSONAS_DIR}/you.md`;
export const DEFAULT_PERSONA_CLASSIFIER_FILE = `${DEFAULT_PERSONAS_DIR}/classifier.md`;
export const DEFAULT_PERSONA_TRANSCRIBE_FILE = `${DEFAULT_PERSONAS_DIR}/transcribe.md`;
export const DEFAULT_PERSONA_SUMMARIZE_FILE = `${DEFAULT_PERSONAS_DIR}/summarize.md`;
export const DEFAULT_PERSONA_RECEIPT_FILE = `${DEFAULT_PERSONAS_DIR}/receipt.md`;
export const DEFAULT_PERSONA_BILL_FILE = `${DEFAULT_PERSONAS_DIR}/bill.md`;

export const DEFAULT_PERSONA_SENTRY_BILL_FILE = `${DEFAULT_PERSONAS_DIR}/sentry/bill.md`;
export const DEFAULT_PERSONA_SENTRY_EVENT_FILE = `${DEFAULT_PERSONAS_DIR}/sentry/event.md`;
export const DEFAULT_PERSONA_SENTRY_PERSON_FILE = `${DEFAULT_PERSONAS_DIR}/sentry/person.md`;
export const DEFAULT_PERSONA_SENTRY_RECEIPT_FILE = `${DEFAULT_PERSONAS_DIR}/sentry/receipt.md`;

export const DEFAULT_INSTRUCTIONS_DIR = `/instructions`;

export const DEFAULT_TYPE_INSTRUCTIONS_DIR = `${DEFAULT_INSTRUCTIONS_DIR}/types`;

export const DEFAULT_INSTRUCTIONS_CLASSIFY_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/classify.md`;
export const DEFAULT_INSTRUCTIONS_COMPOSE_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/compose.md`;
export const DEFAULT_INSTRUCTIONS_TRANSCRIBE_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/transcribe.md`;
export const DEFAULT_INSTRUCTIONS_SUMMARIZE_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/summarize.md`;
export const DEFAULT_INSTRUCTIONS_RECEIPT_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/receipt.md`;
export const DEFAULT_INSTRUCTIONS_BILL_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/bill.md`;

export const DEFAULT_INSTRUCTIONS_SENTRY_BILL_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/sentry/bill.md`;
export const DEFAULT_INSTRUCTIONS_SENTRY_EVENT_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/sentry/event.md`;
export const DEFAULT_INSTRUCTIONS_SENTRY_PERSON_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/sentry/person.md`;
export const DEFAULT_INSTRUCTIONS_SENTRY_RECEIPT_FILE = `${DEFAULT_INSTRUCTIONS_DIR}/sentry/receipt.md`;

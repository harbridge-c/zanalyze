import * as dreadcabinet from '@theunwalked/dreadcabinet';
import * as cardigantime from '@theunwalked/cardigantime';
import { z } from "zod";

export interface DateRange {
    start: Date;
    end: Date;
}

export interface JobArgs {
    currentMonth?: boolean;
    start?: string;
    end?: string;
}

export interface Args extends dreadcabinet.Args, cardigantime.Args {
    dryRun?: boolean;
    verbose?: boolean;
    debug?: boolean;
    model?: string;
    overrides?: boolean;
    contextDirectories?: string[];
    replace?: boolean;
}

export interface CombinedArgs extends Args, JobArgs, dreadcabinet.Args, cardigantime.Args {
}

export const FiltersSchema = z.object({
    include: z.object({
        subject: z.array(z.string()).optional(),
        to: z.array(z.string()).optional(),
        from: z.array(z.string()).optional(),
    }).optional(),
    exclude: z.object({
        subject: z.array(z.string()).optional(),
        to: z.array(z.string()).optional(),
        from: z.array(z.string()).optional(),
    }).optional(),
});

export const SimplifySchema = z.object({
    headers: z.array(z.string()).optional(),
    textOnly: z.boolean().default(true),
    skipAttachments: z.boolean().default(true),
});

export const ConfigSchema = z.object({
    dryRun: z.boolean().default(false),
    verbose: z.boolean().default(false),
    debug: z.boolean().default(false),
    silly: z.boolean().default(false),
    model: z.string().default('gpt-4o'),
    classifyModel: z.string().default('gpt-4o-mini'),
    overrides: z.boolean().default(false),
    contextDirectories: z.array(z.string()).optional(),
    replace: z.boolean().default(false),
    simplify: SimplifySchema.optional(),
    filters: FiltersSchema.optional(),
});

export const JobConfigSchema = z.object({
    currentMonth: z.boolean().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
});

export const SecureConfigSchema = ConfigSchema.extend({
    openaiApiKey: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema> & dreadcabinet.Config & cardigantime.Config;
export type JobConfig = z.infer<typeof JobConfigSchema>;
export type SecureConfig = z.infer<typeof SecureConfigSchema>;

export type FiltersConfig = z.infer<typeof FiltersSchema>;
export type SimplifyConfig = z.infer<typeof SimplifySchema>;

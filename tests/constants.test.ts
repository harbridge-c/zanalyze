import { describe, test, expect } from 'vitest';
import {
    PROGRAM_NAME,
    DEFAULT_CHARACTER_ENCODING,
    DEFAULT_TIMEZONE,
    DEFAULT_MODEL,
    DEFAULT_EMAIL_EXTENSIONS,
    ALLOWED_EMAIL_EXTENSIONS,
    DEFAULT_FILTERS,
    DEFAULT_SIMPLIFY,
    ZANALYZE_DEFAULTS,
    DEFAULT_INPUT_STRUCTURE,
    DEFAULT_OUTPUT_STRUCTURE,
    ALLOWED_INPUT_STRUCTURES,
    ALLOWED_OUTPUT_STRUCTURES,
    DATE_FORMAT_YEAR_MONTH_DAY
} from '../src/constants';

describe('constants', () => {
    test('PROGRAM_NAME should be zanalyze', () => {
        expect(PROGRAM_NAME).toBe('zanalyze');
    });

    test('DEFAULT_CHARACTER_ENCODING should be utf-8', () => {
        expect(DEFAULT_CHARACTER_ENCODING).toBe('utf-8');
    });

    test('DEFAULT_TIMEZONE should be Etc/UTC', () => {
        expect(DEFAULT_TIMEZONE).toBe('Etc/UTC');
    });

    test('DEFAULT_MODEL should be a valid model', () => {
        expect(DEFAULT_MODEL).toBe('gpt-4o');
    });

    test('EMAIL_EXTENSIONS should be properly configured', () => {
        expect(DEFAULT_EMAIL_EXTENSIONS).toEqual(['eml']);
        expect(ALLOWED_EMAIL_EXTENSIONS).toEqual(['eml']);
    });

    test('DEFAULT_FILTERS should have correct structure', () => {
        expect(DEFAULT_FILTERS).toEqual({
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
        });
    });

    test('DEFAULT_SIMPLIFY should have correct structure', () => {
        expect(DEFAULT_SIMPLIFY).toHaveProperty('headers');
        expect(DEFAULT_SIMPLIFY.headers).toBeInstanceOf(Array);
        expect(DEFAULT_SIMPLIFY.textOnly).toBe(true);
        expect(DEFAULT_SIMPLIFY.skipAttachments).toBe(true);

        // Check some expected headers
        expect(DEFAULT_SIMPLIFY.headers).toContain('^Date$');
        expect(DEFAULT_SIMPLIFY.headers).toContain('^From$');
        expect(DEFAULT_SIMPLIFY.headers).toContain('^To$');
        expect(DEFAULT_SIMPLIFY.headers).toContain('^Subject$');
    });

    test('ZANALYZE_DEFAULTS should have all required properties', () => {
        expect(ZANALYZE_DEFAULTS).toHaveProperty('model', DEFAULT_MODEL);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('verbose', false);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('debug', false);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('silly', false);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('dryRun', false);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('replace', false);
        expect(ZANALYZE_DEFAULTS).toHaveProperty('simplify');
        expect(ZANALYZE_DEFAULTS).toHaveProperty('filters');
    });

    test('filesystem structures should be valid', () => {
        expect(DEFAULT_INPUT_STRUCTURE).toBe('month');
        expect(DEFAULT_OUTPUT_STRUCTURE).toBe('month');
        expect(ALLOWED_INPUT_STRUCTURES).toEqual(['none', 'year', 'month', 'day']);
        expect(ALLOWED_OUTPUT_STRUCTURES).toEqual(['none', 'year', 'month', 'day']);
    });

    test('date format constants should be correct', () => {
        expect(DATE_FORMAT_YEAR_MONTH_DAY).toBe('YYYY-MM-DD');
    });

    test('persona file paths should be correctly formatted', () => {
        const DEFAULT_PERSONAS_DIR = '/personas';
        expect(DEFAULT_PERSONAS_DIR).toBe('/personas');
    });

    test('instruction file paths should be correctly formatted', () => {
        const DEFAULT_INSTRUCTIONS_DIR = '/instructions';
        expect(DEFAULT_INSTRUCTIONS_DIR).toBe('/instructions');
    });
}); 
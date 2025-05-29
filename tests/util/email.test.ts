import { describe, test, expect, vi } from 'vitest';
import { fromEml } from '../../src/util/email';
import type { EmlContent } from '@vortiq/eml-parse-js';

// Mock the @vortiq/eml-parse-js module
vi.mock('@vortiq/eml-parse-js', () => ({
    parseEml: vi.fn(),
    readEml: vi.fn()
}));

describe('email utility', () => {
    test('fromEml should parse and read EML content', async () => {
        const { parseEml, readEml } = await import('@vortiq/eml-parse-js');

        const mockEmlString = 'Subject: Test Email\nFrom: test@example.com\n\nTest content';
        const mockParsedEml = { parsed: true };
        const mockEmlContent: EmlContent = {
            headers: {
                subject: 'Test Email',
                from: 'test@example.com'
            },
            text: 'Test content',
            html: null,
            attachments: []
        } as unknown as EmlContent;

        (parseEml as any).mockReturnValue(mockParsedEml);
        (readEml as any).mockReturnValue(mockEmlContent);

        const result = fromEml(mockEmlString);

        expect(parseEml).toHaveBeenCalledWith(mockEmlString);
        expect(readEml).toHaveBeenCalledWith(mockParsedEml);
        expect(result).toEqual(mockEmlContent);
    });

    test('fromEml should handle empty EML string', async () => {
        const { parseEml, readEml } = await import('@vortiq/eml-parse-js');

        const mockParsedEml = { parsed: true };
        const mockEmlContent: EmlContent = {
            headers: {},
            text: '',
            html: null,
            attachments: []
        } as unknown as EmlContent;

        (parseEml as any).mockReturnValue(mockParsedEml);
        (readEml as any).mockReturnValue(mockEmlContent);

        const result = fromEml('');

        expect(parseEml).toHaveBeenCalledWith('');
        expect(readEml).toHaveBeenCalledWith(mockParsedEml);
        expect(result).toEqual(mockEmlContent);
    });

    test('fromEml should propagate errors from parseEml', async () => {
        const { parseEml } = await import('@vortiq/eml-parse-js');

        const error = new Error('Parse error');
        (parseEml as any).mockImplementation(() => {
            throw error;
        });

        expect(() => fromEml('invalid eml')).toThrow('Parse error');
    });

    test('fromEml should propagate errors from readEml', async () => {
        const { parseEml, readEml } = await import('@vortiq/eml-parse-js');

        const mockParsedEml = { parsed: true };
        (parseEml as any).mockReturnValue(mockParsedEml);

        const error = new Error('Read error');
        (readEml as any).mockImplementation(() => {
            throw error;
        });

        expect(() => fromEml('valid eml')).toThrow('Read error');
    });
}); 
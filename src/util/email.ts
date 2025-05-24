import { parseEml, readEml } from '@vortiq/eml-parse-js';
import type { EmlContent } from '@vortiq/eml-parse-js';

export const fromEml = (eml: string): EmlContent => {
    const parsed = parseEml(eml);
    const content = readEml(parsed);
    return content;
}
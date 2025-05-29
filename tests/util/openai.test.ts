import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCompletion, transcribeAudio, OpenAIError } from '../../src/util/openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Mock the OpenAI module
vi.mock('openai', () => ({
    OpenAI: vi.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: vi.fn()
            }
        },
        audio: {
            transcriptions: {
                create: vi.fn()
            }
        }
    }))
}));

// Mock logging
vi.mock('../../src/logging', () => ({
    getLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        silly: vi.fn()
    }))
}));

// Mock storage
vi.mock('../../src/util/storage', () => ({
    create: vi.fn(() => ({
        writeFile: vi.fn(),
        readStream: vi.fn()
    }))
}));

describe('openai utility', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, OPENAI_API_KEY: 'test-api-key' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('createCompletion', () => {
        test('should create completion successfully', async () => {
            const { OpenAI } = await import('openai');
            const mockCreate = vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Test response from OpenAI'
                    }
                }]
            });

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            const result = await createCompletion(messages);

            expect(result).toBe('Test response from OpenAI');
            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-4o-mini',
                messages,
                max_completion_tokens: 10000,
                response_format: undefined
            });
        });

        test('should use custom model when specified', async () => {
            const { OpenAI } = await import('openai');
            const mockCreate = vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Test response'
                    }
                }]
            });

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            await createCompletion(messages, { model: 'gpt-4' });

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4'
                })
            );
        });

        test('should parse JSON response when responseFormat is specified', async () => {
            const { OpenAI } = await import('openai');
            const mockResponse = { key: 'value', number: 123 };
            const mockCreate = vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockResponse)
                    }
                }]
            });

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Return JSON' }
            ];

            const result = await createCompletion(messages, {
                responseFormat: { type: 'json_object' }
            });

            expect(result).toEqual(mockResponse);
        });

        test('should write debug file when debug options are provided', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockWriteFile = vi.fn();
            (createStorage as any).mockReturnValue({
                writeFile: mockWriteFile
            });

            const mockCreate = vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Test response'
                    }
                }]
            });

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            await createCompletion(messages, {
                debug: true,
                debugFile: '/debug/completion.json'
            });

            expect(mockWriteFile).toHaveBeenCalledWith(
                '/debug/completion.json',
                expect.any(String),
                'utf8'
            );
        });

        test('should throw OpenAIError when API key is not set', async () => {
            delete process.env.OPENAI_API_KEY;

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            await expect(createCompletion(messages)).rejects.toThrow(OpenAIError);
            await expect(createCompletion(messages)).rejects.toThrow(
                'OPENAI_API_KEY environment variable is not set'
            );
        });

        test('should throw OpenAIError when no response is received', async () => {
            const { OpenAI } = await import('openai');
            const mockCreate = vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: null
                    }
                }]
            });

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            await expect(createCompletion(messages)).rejects.toThrow(OpenAIError);
            await expect(createCompletion(messages)).rejects.toThrow(
                'No response received from OpenAI'
            );
        });

        test('should throw OpenAIError on API error', async () => {
            const { OpenAI } = await import('openai');
            const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));

            (OpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));

            const messages: ChatCompletionMessageParam[] = [
                { role: 'user', content: 'Hello' }
            ];

            await expect(createCompletion(messages)).rejects.toThrow(OpenAIError);
            await expect(createCompletion(messages)).rejects.toThrow(
                'Failed to create completion: API Error'
            );
        });
    });

    describe('transcribeAudio', () => {
        test('should transcribe audio successfully', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockStream = { pipe: vi.fn() };
            const mockReadStream = vi.fn().mockResolvedValue(mockStream);
            (createStorage as any).mockReturnValue({
                readStream: mockReadStream
            });

            const mockTranscription = { text: 'Transcribed audio text' };
            const mockCreate = vi.fn().mockResolvedValue(mockTranscription);

            (OpenAI as any).mockImplementation(() => ({
                audio: {
                    transcriptions: {
                        create: mockCreate
                    }
                }
            }));

            const result = await transcribeAudio('/path/to/audio.mp3');

            expect(result).toEqual(mockTranscription);
            expect(mockReadStream).toHaveBeenCalledWith('/path/to/audio.mp3');
            expect(mockCreate).toHaveBeenCalledWith({
                model: 'whisper-1',
                file: mockStream,
                response_format: 'json'
            });
        });

        test('should use custom model when specified', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockStream = { pipe: vi.fn() };
            (createStorage as any).mockReturnValue({
                readStream: vi.fn().mockResolvedValue(mockStream)
            });

            const mockCreate = vi.fn().mockResolvedValue({ text: 'Test' });

            (OpenAI as any).mockImplementation(() => ({
                audio: {
                    transcriptions: {
                        create: mockCreate
                    }
                }
            }));

            await transcribeAudio('/path/to/audio.mp3', { model: 'whisper-2' });

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'whisper-2'
                })
            );
        });

        test('should write debug file when debug options are provided', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockWriteFile = vi.fn();
            const mockStream = { pipe: vi.fn() };
            (createStorage as any).mockReturnValue({
                readStream: vi.fn().mockResolvedValue(mockStream),
                writeFile: mockWriteFile
            });

            const mockTranscription = { text: 'Transcribed text' };
            const mockCreate = vi.fn().mockResolvedValue(mockTranscription);

            (OpenAI as any).mockImplementation(() => ({
                audio: {
                    transcriptions: {
                        create: mockCreate
                    }
                }
            }));

            await transcribeAudio('/path/to/audio.mp3', {
                debug: true,
                debugFile: '/debug/transcription.json'
            });

            expect(mockWriteFile).toHaveBeenCalledWith(
                '/debug/transcription.json',
                JSON.stringify(mockTranscription, null, 2),
                'utf8'
            );
        });

        test('should throw OpenAIError when API key is not set', async () => {
            delete process.env.OPENAI_API_KEY;

            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(OpenAIError);
            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(
                'OPENAI_API_KEY environment variable is not set'
            );
        });

        test('should throw OpenAIError when no transcription is received', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockStream = { pipe: vi.fn() };
            (createStorage as any).mockReturnValue({
                readStream: vi.fn().mockResolvedValue(mockStream)
            });

            const mockCreate = vi.fn().mockResolvedValue(null);

            (OpenAI as any).mockImplementation(() => ({
                audio: {
                    transcriptions: {
                        create: mockCreate
                    }
                }
            }));

            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(OpenAIError);
            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(
                'No transcription received from OpenAI'
            );
        });

        test('should throw OpenAIError on API error', async () => {
            const { OpenAI } = await import('openai');
            const { create: createStorage } = await import('../../src/util/storage');

            const mockStream = { pipe: vi.fn() };
            (createStorage as any).mockReturnValue({
                readStream: vi.fn().mockResolvedValue(mockStream)
            });

            const mockCreate = vi.fn().mockRejectedValue(new Error('Transcription failed'));

            (OpenAI as any).mockImplementation(() => ({
                audio: {
                    transcriptions: {
                        create: mockCreate
                    }
                }
            }));

            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(OpenAIError);
            await expect(transcribeAudio('/path/to/audio.mp3')).rejects.toThrow(
                'Failed to transcribe audio: Transcription failed'
            );
        });
    });

    describe('OpenAIError', () => {
        test('should be an instance of Error', () => {
            const error = new OpenAIError('Test error');
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('OpenAIError');
            expect(error.message).toBe('Test error');
        });
    });
}); 
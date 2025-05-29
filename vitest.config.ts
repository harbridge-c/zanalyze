import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        root: '.',
        globals: false, // We'll use explicit imports instead of globals
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html', 'json-summary'],
            include: ['src/**/*.ts'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData.ts'
            ],
            enabled: true,
            thresholds: {
                global: {
                    branches: 95,
                    functions: 90,
                    lines: 77,
                    statements: 77,
                }
            }
        },
        setupFiles: [],
        testTimeout: 30000,
        pool: 'forks',
        poolOptions: {
            forks: {
                maxForks: 4,
                minForks: 1,
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@vite': resolve(__dirname, './src')
        }
    },
    esbuild: {
        target: 'node20'
    }
}); 
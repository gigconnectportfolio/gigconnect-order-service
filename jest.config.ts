import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // <-- add this
    collectCoverage: true,
    testPathIgnorePatterns: ['/node_modules/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tsconfig.jest.json'
        }],
        '^.+\\.m?js$': ['ts-jest', { // New entry to transform .mjs or .js files
            useESM: true,
            tsconfig: 'tsconfig.jest.json'
        }],
    },
    transformIgnorePatterns: [],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // For relative .js path support
        '^src/(.*)$': '<rootDir>/src/$1', // Add this line for your 'src/*' alias
    },
    testMatch: ['<rootDir>/src/**/test/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/test/**/*.ts',
        '!src/database/**',      // 👈 exclude DB init
        '!src/models/**',        // 👈 exclude Sequelize models if auto-init
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 1,
            functions: 1,
            lines: 1,
            statements: 1,
        },
    },
    coverageReporters: ['text-summary', 'lcov'],
};

export default config;

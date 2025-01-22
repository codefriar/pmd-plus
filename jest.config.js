module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePathIgnorePatterns: ['<rootDir>/out/'],
    testMatch: ['**/test/**/*.test.ts'],
    setupFilesAfterEnv: ['./src/test/setup.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/test/mocks/vscode.ts',
    },
};

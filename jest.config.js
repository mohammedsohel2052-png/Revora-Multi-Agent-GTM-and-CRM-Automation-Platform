/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/apps/api/test/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          noImplicitAny: false,
          resolveJsonModule: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@revora/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@revora/db$': '<rootDir>/packages/db/src/index.ts',
    '^@revora/db/(.*)$': '<rootDir>/packages/db/src/$1',
  },
  testTimeout: 30000,
};

const moduleNameMapper = {
  '^@app/(.*)$': '<rootDir>/src/app/$1',
  '^@test/(.*)$': '<rootDir>/test/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
  '^@configs/(.*)$': '<rootDir>/src/configs/$1',
  '^@types/(.*)$': '<rootDir>/types/$1',
  '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
  '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  '^@models/(.*)$': '<rootDir>/src/models/$1',
};

module.exports = {
  moduleNameMapper,
  projects: [
    // Integration tests config
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      globalSetup: '<rootDir>/test/globalSetup.ts',
      globalTeardown: '<rootDir>/test/globalTeardown.ts',
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {useESM: true}],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper,
      maxWorkers: '50%',
      detectOpenHandles: true,
      testTimeout: 10000,
    },
    // Unit tests config
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', {useESM: true}],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper,
      testTimeout: 10000,
    },
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};

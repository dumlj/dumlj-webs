import { pathsToModuleNameMapper } from 'ts-jest'
import type { Config } from '@jest/types'
import { compilerOptions } from './tsconfig.jest.json'

const { paths: tsconfigPaths } = compilerOptions

export default (): Config.InitialOptions => ({
  preset: 'jest-puppeteer',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  globalSetup: '<rootDir>/__tests__/setup.ts',
  globalTeardown: '<rootDir>/__tests__/teardown.ts',
  testEnvironment: '<rootDir>/__tests__/puppeteer_environment.ts',
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsconfigPaths, {
      prefix: '<rootDir>',
    }),
  },
  setupFiles: ['<rootDir>/__tests__/setupTests.ts'],
})

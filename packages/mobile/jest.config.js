/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '@testing-library/jest-native/extend-expect'
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/coverage/',
    '/__screenshots__/'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.contract.{ts,tsx}',
    '!src/**/*.performance.{ts,tsx}',
    '!src/**/*.visual.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/**/*.types.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    'src/services/**/*.{ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/components/**/*.{ts,tsx}': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    'src/hooks/**/*.{ts,tsx}': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context)'
  ],
  testEnvironment: 'jsdom',
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,
  
  // Test result processors (commented out for now due to missing dependencies)
  // reporters: [
  //   'default',
  //   [
  //     'jest-junit',
  //     {
  //       outputDirectory: 'coverage',
  //       outputName: 'junit.xml',
  //       ancestorSeparator: ' › ',
  //       uniqueOutputName: 'false',
  //       suiteNameTemplate: '{filepath}',
  //       classNameTemplate: '{classname}',
  //       titleTemplate: '{title}'
  //     }
  //   ],
  //   [
  //     'jest-html-reporters',
  //     {
  //       publicPath: 'coverage',
  //       filename: 'test-report.html',
  //       expand: true,
  //       hideIcon: false,
  //       pageTitle: 'Mobile App Test Report'
  //     }
  //   ]
  // ],

  // Global test setup
  globalSetup: '<rootDir>/src/test/globalSetup.ts',
  globalTeardown: '<rootDir>/src/test/globalTeardown.ts',

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Collect coverage from untested files
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.contract.{ts,tsx}',
    '!src/**/*.performance.{ts,tsx}',
    '!src/**/*.visual.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/**/*.types.{ts,tsx}',
    '!src/**/__tests__/**/*',
    '!src/**/__mocks__/**/*'
  ],

  // Watch plugins for better development experience (commented out for now)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ],

  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot serializers (commented out for now)
  // snapshotSerializers: [
  //   '@testing-library/jest-native/serializer'
  // ],

  // Custom test projects for different test types (commented out for now)
  // projects: [
  //   // Unit tests
  //   {
  //     displayName: 'unit',
  //     testMatch: [
  //       '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx)',
  //       '<rootDir>/src/**/*.(test|spec).(ts|tsx)'
  //     ],
  //     testPathIgnorePatterns: [
  //       '/node_modules/',
  //       '/e2e/',
  //       '.*\\.integration\\.(test|spec)\\.(ts|tsx)$',
  //       '.*\\.contract\\.(test|spec)\\.(ts|tsx)$',
  //       '.*\\.performance\\.(test|spec)\\.(ts|tsx)$',
  //       '.*\\.visual\\.(test|spec)\\.(ts|tsx)$'
  //     ]
  //   }
  // ]
};
module.exports = {
  root: true,
  extends: ['expo'],
  rules: {
    // Disable problematic rules for now
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'no-var': 'off', // Allow var in type declarations
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.expo/',
    'ios/',
    'android/',
  ],
  overrides: [
    {
      files: ['e2e/**/*.js'],
      env: {
        jest: true,
      },
      globals: {
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
        waitFor: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        expect: 'readonly',
      },
    },
  ],
};
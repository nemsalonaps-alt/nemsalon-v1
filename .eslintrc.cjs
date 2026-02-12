module.exports = {
  root: true,
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/ios/**',
    '**/android/**'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['apps/api/src/modules/**/domain/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '**/api/**',
              '**/repo/**',
              '**/service/**',
              '**/server/**',
              '**/config/**'
            ]
          }
        ]
      }
    },
    {
      files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
      env: { browser: true }
    },
    {
      files: ['apps/api/**/*.{ts,tsx,js,jsx}', 'scripts/**/*.{js,ts,mjs,cjs}'],
      env: { node: true }
    },
    {
      files: [
        'apps/api/test/**/*.{ts,tsx,js,jsx}',
        'apps/web/e2e/**/*.{ts,tsx,js,jsx}'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
  }
};

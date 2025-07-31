const js = require('@eslint/js');

module.exports = [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/', 
      'coverage/',
      '*.config.js',
      'vite.config.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
        React: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        CustomEvent: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-unused-vars': ['error', { 
        args: 'after-used',
        argsIgnorePattern: '^_',
        vars: 'all',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-useless-escape': 'error',
      'no-useless-catch': 'error'
    }
  }
];
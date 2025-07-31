const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.config.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console.log in development
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
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
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
        React: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      'react/react-in-jsx-scope': 'off'
    }
  }
];
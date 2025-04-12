import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
    files: ['**/*.js'],
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
    },
  },
];
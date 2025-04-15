import js from '@eslint/js';

export default [
  js.configs.recommended,

  // Server-side Node.js (ESM)
  {
    files: ['**/*.js'],
    ignores: ['public/js/**'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },

  // Cliend-side browser scripts
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 'latest',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        CustomEvent: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        speechSynthesis: 'readonly',
        atob: 'readonly',
      },
    },
  }
];

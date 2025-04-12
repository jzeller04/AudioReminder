import js from '@eslint/js';

export default [
  js.configs.recommended,


  {
    files: ['**/*.js'],
    ignores: ['**/reference/**', '**/src/**', '**/js/**'],
    languageOptions: {
      sourceType: 'commonjs',
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

  {
    files: ['js/**/*.js', 'run/**/*.js', 'reference/src/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 'latest',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        CustomEvent: 'readonly',
        speechSynthesis: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        atob: 'readonly',
      },
    },
  },
];
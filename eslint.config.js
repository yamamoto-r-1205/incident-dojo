import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Rendering untrusted strings as HTML is forbidden in this project (see .kiro/steering/tech.md).
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent / DOM APIs instead of innerHTML.' },
        { property: 'outerHTML', message: 'Use textContent / DOM APIs instead of outerHTML.' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The engine must stay pure: no DOM, no Node built-ins.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*', 'fs', 'path', 'os', 'child_process'], message: 'src/engine must not depend on Node APIs.' },
            { group: ['@xterm/*', '../ui/*', '../i18n/*'], message: 'src/engine must not depend on UI code.' },
          ],
        },
      ],
      // Determinism: no clock, no randomness, no browser globals inside the engine.
      'no-restricted-globals': ['error', 'document', 'window', 'localStorage', 'Date'],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent / DOM APIs instead of innerHTML.' },
        { property: 'outerHTML', message: 'Use textContent / DOM APIs instead of outerHTML.' },
        { object: 'Math', property: 'random', message: 'The engine must be deterministic.' },
      ],
    },
  },
);

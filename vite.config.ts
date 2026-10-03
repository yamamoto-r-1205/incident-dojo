import { defineConfig } from 'vitest/config';

// Relative base so the same build works on GitHub Pages (/incident-dojo/) and locally.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

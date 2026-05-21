import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Exclude git worktrees and build artifacts so only the main project's
    // tests under src/__tests__/ are collected.
    exclude: [
      '**/node_modules/**',
      '**/.claude/**',
      '**/.next/**',
      '**/dist/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  oxc: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    // Exclude git worktrees and build artifacts so only the main project's
    // tests under src/__tests__/ are collected.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/.next/**", "**/dist/**"],
    // Los *.db.test.ts aplican todas las migraciones a un PGlite en su
    // beforeAll: ~5 s cada uno, y varios a la vez en paralelo. Con el límite
    // por defecto de 10 s, de vez en cuando uno se pasaba y el archivo entero
    // caía con sus tests en "skipped" (visto dos veces el 2026-09-27). No es
    // un test lento: es una migración completa por archivo.
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});

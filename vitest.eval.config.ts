import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * The eval suite — `pnpm eval`. Separate from `vitest.config.ts` because these
 * call real models: slow, non-deterministic, and they cost money. `pnpm test`
 * stays pure, fast, and offline.
 */
export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    setupFiles: ["./evals/setup.ts"],
    // A generation plus a judge call, per test.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // Fixtures are independent; run the files at once rather than end to end.
    fileParallelism: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

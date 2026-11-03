import { defineConfig, defaultExclude } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30000,
    exclude: [...defaultExclude, "**/benchmark_100k.test.ts"],
  },
});

import { defineConfig, defaultExclude } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 60000,
    include: ["tests/integration/benchmark_100k.test.ts"],
    exclude: defaultExclude,
  },
});


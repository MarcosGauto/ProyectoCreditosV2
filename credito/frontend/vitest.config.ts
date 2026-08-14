import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/creditScore/scoreEngine.ts",
        "src/lib/creditScore/evaluators/**/*.ts",
        "src/lib/creditScore/aggregator/**/*.ts",
        "src/lib/creditScore/ruleEngine/**/*.ts",
        "src/lib/creditLimit/engine/**/*.ts",
        "src/lib/creditLimit/policy/limitPolicyDefaults.ts",
        "src/lib/creditLimit/policy/limitPolicyRevision.ts",
        "src/lib/creditLimit/commercial/**/*.ts",
      ],
      exclude: [
        "**/*.md",
        "**/ARCHITECTURE.md",
        "**/DESIGN.md",
        "**/index.ts",
        "**/*Types.ts",
        "**/types.ts",
        "**/limitOverride.ts",
        "**/limitEngineTypes.ts",
        "**/limitTraceCodes.ts",
        "**/commercialContext.ts",
        "**/creditScoreContract.js",
      ],
      thresholds: {
        /** Orquestadores scoreEngine/runLimitEngine están al 100%; el tree completo de stages/evaluators arrastra al ~82%. */
        lines: 80,
        functions: 90,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
})

import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({
  baseDirectory: __dirname,
})

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "out/**",
      "public/**",
      "**/*.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    // Scope estricto SC-1.0: el resto del monoreto legacy acumula warnings previos.
    files: [
      "src/lib/sc1/**/*.{js,ts}",
      "src/lib/creditScore/**/*.{js,ts}",
      "src/lib/creditLimit/**/*.{js,ts}",
      "src/lib/settings/projection/**/*.{js,ts}",
      "src/lib/creditAnalysis/buildSc1PublishSlice.js",
      "src/lib/creditAnalysis/validatePublishReadiness.js",
    ],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
    },
  },
]

export default config

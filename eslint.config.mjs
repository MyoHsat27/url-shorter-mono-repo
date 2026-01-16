import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/node_modules/**",
      "commitlint.config.*",
      "eslint.config.*",
      "prettier.config.*",
      "*.config.cjs",
      "*.config.js",
    ],
  },

  // Base JS rules
  eslint.configs.recommended,

  // URL Service (Nest.js)
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["apps/url-service/**/*.ts"],
    languageOptions: {
      ...c.languageOptions,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: ["apps/url-service/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  })),

  // WEB (Next.js)
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      ...c.languageOptions,
      globals: globals.browser,
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: ["apps/web/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  })),

  // Shared packages
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["packages/**/*.ts"],
    languageOptions: {
      ...c.languageOptions,
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: ["packages/*/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  })),

  // Prettier integration
  prettier,

  // Global rule tweaks
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },
];

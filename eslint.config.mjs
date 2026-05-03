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
      "infra/cdk/*",
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

  // Analytics Service (Nest.js)
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["apps/analytics-service/**/*.ts"],
    languageOptions: {
      ...c.languageOptions,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: ["apps/analytics-service/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  })),

  // Auth Service (Nest.js)
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["apps/auth-service/**/*.ts"],
    languageOptions: {
      ...c.languageOptions,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: ["apps/auth-service/tsconfig.json"],
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
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "prettier/prettier": ["error", { endOfLine: "lf" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
];

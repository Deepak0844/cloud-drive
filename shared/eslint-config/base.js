import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      turbo: turboPlugin,
      import: importPlugin,
    },
    rules: {
      // Turbo rules
      "turbo/no-undeclared-env-vars": "warn",

      // Variable declaration rules
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "warn",

      // Code quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-return-await": "error",
      "require-await": "warn",

      // Import/Export rules
      "import/order": [
        "error",
        {
          groups: [["builtin", "external"], "internal", "parent", "sibling", "index", "object"],
          pathGroups: [
            {
              pattern: "{react,react-dom/**}",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "{antd,react-router-dom,core-js/**,scheduler/**,url,path}",
              group: "external",
              position: "before",
            },
            {
              pattern: "@shared-constants/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@shared-utils/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@shared-hooks/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@shared-components/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "./**/*.css",
              group: "object",
              position: "after",
            },
            {
              pattern: "../**/*.css",
              group: "object",
              position: "after",
            },
            {
              pattern: "*.css",
              group: "object",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          warnOnUnassignedImports: true,
        },
      ],
      "import/no-duplicates": "error",
      "import/no-unresolved": "off", // Handled by jsconfig
      "import/named": "off", // Handled by jsconfig
    },
  },
  {
    ignores: ["dist/**", "build/**", "node_modules/**"],
  },
];

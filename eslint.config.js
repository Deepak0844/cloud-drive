import globals from "globals";

import { config as reactConfig } from "./shared/eslint-config/react-internal.js";

/**
 * Root ESLint configuration for the monorepo.
 * This enables ESLint to run in the IDE across all packages.
 */
export default [
  ...reactConfig,
  {
    files: ["apps/server/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["apps/server/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    files: ["apps/mobile/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["apps/mobile/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.es2021,
        __DEV__: "readonly",
      },
    },
  },
  {
    // Expo config plugins are loaded via synchronous require() by prebuild tooling, so they're
    // always CommonJS regardless of where they live in the tree (e.g. a local module's
    // app.plugin.js) — needs Node globals rather than the browser/RN globals above.
    files: ["apps/mobile/**/app.plugin.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
  },
  // Disable react-refresh warning for shadcn/ui generated files.
  // These files intentionally export both components and utility functions (e.g. buttonVariants).
  {
    files: ["apps/web/src/components/ui/**/*.jsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.turbo/**"],
  },
];

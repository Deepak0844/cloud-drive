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

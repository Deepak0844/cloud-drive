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
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.turbo/**"],
  },
];

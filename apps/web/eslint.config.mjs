import { config as reactInternalConfig } from "@shared-eslint/config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [{ ignores: ["dist/**"] }, ...reactInternalConfig];

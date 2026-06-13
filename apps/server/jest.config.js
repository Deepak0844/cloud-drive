import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NAS_STORAGE_PATH = path.resolve(__dirname, "test-storage");

export default {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "utils/**/*.js",
    "!**/*.test.js",
    "!**/node_modules/**",
  ],
  testMatch: ["**/__tests__/**/*.test.js"],
  testPathIgnorePatterns: ["<rootDir>/__tests__/helpers/"],
  transform: {},
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

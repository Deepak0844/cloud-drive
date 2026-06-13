import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load base vars, then overlay environment-specific vars (e.g. env/.env.development adds secrets).
// Tests run with NODE_ENV=test but share the development secrets (in-memory DB; no real connection).
const envSuffix = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;
dotenv.config({ path: path.resolve(__dirname, "../env/.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, `../env/.env.${envSuffix}`), quiet: true });

/**
 * Environment Variable Schema
 */
const envSchema = z.object({
  PORT: z.string().default("9000"),
  MONGODB_URI: z.string({
    required_error: "MONGODB_URI is required",
  }),
  JWT_SECRET: z.string({
    required_error: "JWT_SECRET is required",
  }),
  STORAGE_ENCRYPTION_KEY: z
    .string({
      required_error: "STORAGE_ENCRYPTION_KEY is required for file encryption",
    })
    .length(64, "STORAGE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_EMAIL: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("15m"), // Access token lifetime — must be shorter than REFRESH_COOKIE_NAME cookie (REFRESH_MAX_AGE_MS = 7 days)
  FROM_NAME: z.string().default("Cloud Drive"),
  FROM_EMAIL: z.string().default("noreply@cloud-drive.com"),
  DEFAULT_QUOTA_BYTES: z.string().transform(Number).default("10000000000"),
  NAS_STORAGE_PATH: z.string({
    required_error: "NAS_STORAGE_PATH is required",
  }),
  APP_BASE_URL: z.string().url().default("http://localhost:9000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  TRASH_EXPIRY_DAYS: z.string().transform(Number).default("30"),
  CLEANUP_INTERVAL_HOURS: z.string().transform(Number).default("1"),
  TEMP_UPLOAD_EXPIRY_HOURS: z.string().transform(Number).default("24"),
  ALLOWED_ORIGINS: z.string().optional(), // Comma-separated list of allowed CORS origins
});

// Validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

const Env = parsed.data;

export default Env;

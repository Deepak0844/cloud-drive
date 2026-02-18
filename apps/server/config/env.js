import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Environment Variable Schema
 */
const envSchema = z.object({
  PORT: z.string().default("9001"),
  MONGODB_URI: z.string({
    required_error: "MONGODB_URI is required",
  }),
  JWT_SECRET: z.string({
    required_error: "JWT_SECRET is required",
  }),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_EMAIL: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("1h"),
  FROM_NAME: z.string().default("Cloud Drive"),
  FROM_EMAIL: z.string().default("noreply@cloud-drive.com"),
  DEFAULT_QUOTA_BYTES: z.string().transform(Number).default("1073741824"),
  NAS_STORAGE_PATH: z.string({
    required_error: "NAS_STORAGE_PATH is required",
  }),
  APP_BASE_URL: z.string().url().default("http://localhost:9001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
});

// Validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const logger = (await import("../utils/logger.js")).default;
  logger.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

const Env = parsed.data;

export default Env;

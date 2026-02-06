import dotenv from "dotenv";

dotenv.config();

// Load environment variables from .env file
const Env = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  FROM_NAME: process.env.FROM_NAME || "Cloud Drive",
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@cloud-drive.com",
  DEFAULT_QUOTA_BYTES: parseInt(process.env.DEFAULT_QUOTA_BYTES, 10) || 1073741824, // 1 GB

  NAS_STORAGE_PATH: process.env.NAS_STORAGE_PATH,
};

export default Env;

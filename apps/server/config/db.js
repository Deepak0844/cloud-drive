import mongoose from "mongoose";

// Config
import EnvConfig from "#config/env.js";

// Utils
import logger from "#utils/logger.js";

export default async function connectToDatabase() {
  try {
    await mongoose.connect(EnvConfig.MONGODB_URI, { dbName: "cloud-drive" });
    logger.info("✅ Connected to MongoDB");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
  }
}

// Native modules
import fs from "fs";
import path from "path";

// Third-party modules
import cron from "node-cron";

// Services
import DuplicateService from "../services/duplicate.service.js";
import TrashService from "../services/trash.service.js";

// Config
import config from "../config/env.js";

// Utils
import logger from "./logger.js";

/**
 * Initialize cron jobs
 * 1. Daily at midnight cleanup of trash older than 30 days
 * 2. Hourly cleanup of orphaned temp uploads
 * 3. Daily at 02:00 Duplicate Finder
 */
function initCronJobs() {
  // 1. Daily at midnight: Smart Trash Cleanup
  cron.schedule("0 0 * * *", async () => {
    try {
      await TrashService.autoPurgeExpiredItems();
    } catch (err) {
      logger.error("❌ Scheduled Trash cleanup error:", err);
    }
  });

  // 2. Scheduled cleanup of orphaned temp uploads
  const cleanupIntervalHours = config.CLEANUP_INTERVAL_HOURS;
  cron.schedule(`0 */${cleanupIntervalHours} * * *`, async () => {
    logger.info("🧹 Running temp upload cleanup...");
    try {
      const tempDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads");
      try {
        await fs.promises.access(tempDir);
      } catch {
        return; // Directory doesn't exist
      }

      const sessions = await fs.promises.readdir(tempDir);
      const now = Date.now();
      const expiryMs = config.TEMP_UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000;

      for (const session of sessions) {
        const sessionPath = path.join(tempDir, session);
        try {
          const stats = await fs.promises.stat(sessionPath);
          if (now - stats.mtimeMs > expiryMs) {
            logger.info(`Deleting orphaned session: ${session}`);
            await fs.promises.rm(sessionPath, { recursive: true, force: true });
          }
        } catch (err) {
          logger.warn(`Could not stat session ${session}: ${err.message}`);
        }
      }
      logger.info("✅ Temp cleanup completed.");
    } catch (err) {
      logger.error("❌ Temp cleanup error:", err);
    }
  });

  // 3. Daily at 02:00: Duplicate Finder
  cron.schedule("0 2 * * *", async () => {
    logger.info("🔍 Running daily duplicate finder...");
    await DuplicateService.findAndNotifyDuplicates();
    logger.info("✅ Duplicate finder completed.");
  });

  // Trigger Duplicate Finder on server start
  setTimeout(async () => {
    logger.info("🚀 Triggering Duplicate Finder on server startup...");
    try {
      await DuplicateService.findAndNotifyDuplicates();
    } catch (err) {
      logger.error("❌ Startup Duplicate Finder failed:", err.message);
    }
  }, 5000);

  logger.info("⏰ Cron jobs initialized");
}

// Exports
const CronUtils = {
  initCronJobs,
};

export default CronUtils;

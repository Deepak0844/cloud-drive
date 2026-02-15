// Native modules
import fs from "fs";
import path from "path";

// Third-party modules
import cron from "node-cron";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Config
import config from "../config/env.js";

// Utils
import logger from "./logger.js";

/**
 * Initialize cron jobs
 * Currently:
 * 1. Daily at midnight cleanup of trash older than 30 days
 * 2. Hourly cleanup of orphaned temp uploads
 */
function initCronJobs() {
  // Run every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    logger.info("🧹 Running daily trash cleanup...");
    try {
      const expiryDays = config.TRASH_EXPIRY_DAYS;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - expiryDays);

      const itemsToDelete = await File.find({
        is_deleted: true,
        deleted_at: { $lte: thirtyDaysAgo },
      });

      logger.info(`Found ${itemsToDelete.length} items to permanently delete.`);

      for (const file of itemsToDelete) {
        const fileSize = file.size_bytes;
        const userId = file.user;

        // Physical delete
        if (fs.existsSync(file.storage_path)) {
          fs.unlinkSync(file.storage_path);
        }
        if (file.thumbnail_path && fs.existsSync(file.thumbnail_path)) {
          fs.unlinkSync(file.thumbnail_path);
        }
        // DB delete
        await File.deleteOne({ _id: file._id });

        // Update User quota
        await User.findByIdAndUpdate(userId, {
          $inc: { used_bytes: -fileSize },
        });
      }

      logger.info("✅ Trash cleanup completed.");
    } catch (err) {
      logger.error("❌ Trash cleanup error:", err);
    }
  });

  // Run at defined interval: Cleanup orphaned temp uploads
  const cleanupIntervalHours = config.CLEANUP_INTERVAL_HOURS;
  cron.schedule(`0 */${cleanupIntervalHours} * * *`, async () => {
    logger.info("🧹 Running temp upload cleanup...");
    try {
      const tempDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads");
      if (!fs.existsSync(tempDir)) {
        return;
      }

      const sessions = fs.readdirSync(tempDir);
      const now = Date.now();
      const expiryHours = config.TEMP_UPLOAD_EXPIRY_HOURS;
      const expiryMs = expiryHours * 60 * 60 * 1000;

      for (const session of sessions) {
        const sessionPath = path.join(tempDir, session);
        const stats = fs.statSync(sessionPath);
        if (now - stats.mtimeMs > expiryMs) {
          logger.info(`Deleting orphaned session: ${session}`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
      logger.info("✅ Temp cleanup completed.");
    } catch (err) {
      logger.error("❌ Temp cleanup error:", err);
    }
  });

  logger.info("⏰ Cron jobs initialized");
}

// Exports
const CronUtils = {
  initCronJobs,
};

export default CronUtils;

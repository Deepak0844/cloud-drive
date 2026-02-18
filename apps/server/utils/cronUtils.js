// Native modules
import fs from "fs";
import path from "path";

// Third-party modules
import cron from "node-cron";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

// Config
import config from "../config/env.js";

// Constants
import { ItemTypes } from "../constants/generalConstants.js";

// Utils
import logger from "./logger.js";
import DbUtils from "./dbUtils.js";

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
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - expiryDays);

      // 1. Find directly deleted folders that have expired
      const foldersToDelete = await Folder.find({
        is_deleted: true,
        deleted_directly: true,
        deleted_at: { $lte: expiryDate },
      });

      for (const folder of foldersToDelete) {
        logger.info(`Auto-purging expired folder: ${folder.name} (${folder._id})`);
        await DbUtils.permanentDeleteRecursive(ItemTypes.FOLDER, folder._id, folder.user);
      }

      // 2. Find directly deleted files that have expired
      const filesToDelete = await File.find({
        is_deleted: true,
        deleted_directly: true,
        deleted_at: { $lte: expiryDate },
      });

      for (const file of filesToDelete) {
        logger.info(`Auto-purging expired file: ${file.name} (${file._id})`);
        await DbUtils.permanentDeleteRecursive(ItemTypes.FILE, file._id, file.user);
      }

      logger.info("✅ Trash cleanup completed.");
    } catch (err) {
      logger.error("❌ Trash cleanup error:", err);
    }
  });

  // Run at defined interval: Cleanup orphaned temp uploads
  const cleanupIntervalHours = config.CLEANUP_INTERVAL_HOURS;
  cron.schedule(`0 */${cleanupIntervalHours} * * *`, () => {
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

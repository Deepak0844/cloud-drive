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

// Services
import DuplicateService from "../services/duplicate.service.js";

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
  cron.schedule(`0 */${cleanupIntervalHours} * * *`, async () => {
    logger.info("🧹 Running temp upload cleanup...");
    try {
      const tempDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads");

      // Check if temp dir exists asynchronously
      try {
        await fs.promises.access(tempDir);
      } catch {
        return; // Directory doesn't exist, nothing to clean
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
        } catch (statErr) {
          logger.warn(`Could not stat session ${session}: ${statErr.message}`);
        }
      }
      logger.info("✅ Temp cleanup completed.");
    } catch (err) {
      logger.error("❌ Temp cleanup error:", err);
    }
  });

  // Run every day at 02:00: Duplicate Finder
  cron.schedule("0 2 * * *", async () => {
    logger.info("🔍 Running daily duplicate finder...");
    await DuplicateService.findAndNotifyDuplicates();
    logger.info("✅ Duplicate finder completed.");
  });

  // Trigger Duplicate Finder on server start
  // We use a small delay to ensure DB and other services are fully initialized
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

// Native modules
import fs from "fs";
import path from "path";

// Third-party modules
import cron from "node-cron";

// Services
import DuplicateService from "#services/duplicateService.js";
import TrashService from "#services/trashService.js";

// Config
import config from "#config/env.js";

// Constants
import { HlsConfig } from "#constants/generalConstants.js";

// Utils
import HlsCacheUtils from "#utils/hlsCacheUtils.js";
import logger from "#utils/logger.js";

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
      // Chunks live at NAS_STORAGE_PATH/users/<userId>/.chunks/<uploadId>/
      const usersDir = path.join(config.NAS_STORAGE_PATH, "users");
      try {
        await fs.promises.access(usersDir);
      } catch {
        return; // Storage root doesn't exist yet
      }

      const userIds = await fs.promises.readdir(usersDir);
      const now = Date.now();
      const expiryMs = config.TEMP_UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000;

      for (const userId of userIds) {
        const chunksDir = path.join(usersDir, userId, ".chunks");
        try {
          await fs.promises.access(chunksDir);
        } catch {
          continue; // This user has no in-progress chunks
        }

        const sessions = await fs.promises.readdir(chunksDir);
        for (const session of sessions) {
          const sessionPath = path.join(chunksDir, session);
          try {
            const stats = await fs.promises.stat(sessionPath);
            if (now - stats.mtimeMs > expiryMs) {
              logger.info(`Deleting orphaned chunk session: ${session} (user: ${userId})`);
              await fs.promises.rm(sessionPath, { recursive: true, force: true });
            }
          } catch (err) {
            logger.warn(`Could not stat chunk session ${session}: ${err.message}`);
          }
        }
      }
      logger.info("✅ Temp chunk cleanup completed.");
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

  // 4. Every 30 minutes: HLS segment cache cleanup (TTL eviction + LRU)
  cron.schedule(`*/${HlsConfig.CLEANUP_INTERVAL_MINUTES} * * * *`, async () => {
    logger.info("🎬 Running HLS segment cache cleanup...");
    try {
      await HlsCacheUtils.cleanupExpiredSegments(
        config.NAS_STORAGE_PATH,
        HlsConfig.CACHE_TTL_MS,
        HlsConfig.MAX_CACHE_SIZE_BYTES
      );
      logger.info("✅ HLS cache cleanup completed.");
    } catch (err) {
      logger.error("❌ HLS cache cleanup error:", err);
    }
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

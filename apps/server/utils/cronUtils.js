import cron from "node-cron";
import fs from "fs";
import path from "path";

// Config
import config from "../config/env.js";

// Models
import User from "../models/User.js";
import File from "../models/File.js";

/**
 * Initialize cron jobs
 * Currently: Daily at midnight cleanup of trash older than 30 days
 */
function initCronJobs() {
  // Run every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    console.log("🧹 Running daily trash cleanup...");
    try {
      const expiryDays = config.TRASH_EXPIRY_DAYS;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - expiryDays);

      const itemsToDelete = await File.find({
        is_deleted: true,
        deleted_at: { $lte: thirtyDaysAgo },
      });

      console.log(`Found ${itemsToDelete.length} items to permanently delete.`);

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

      console.log("✅ Trash cleanup completed.");
    } catch (err) {
      console.error("❌ Trash cleanup error:", err);
    }
  });

  // Run at defined interval: Cleanup orphaned temp uploads
  const cleanupIntervalHours = config.CLEANUP_INTERVAL_HOURS;
  cron.schedule(`0 */${cleanupIntervalHours} * * *`, async () => {
    console.log("🧹 Running temp upload cleanup...");
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
          console.log(`Deleting orphaned session: ${session}`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
      console.log("✅ Temp cleanup completed.");
    } catch (err) {
      console.error("❌ Temp cleanup error:", err);
    }
  });

  console.log("⏰ Cron jobs initialized");
}

// Exports
// -----------------------------
const CronUtils = {
  initCronJobs,
};

export default CronUtils;

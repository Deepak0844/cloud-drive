// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import User from "#models/User.js";

// Services
import EmailService from "#services/emailService.js";

// Utils
import logger from "#utils/logger.js";
import DbUtils from "#utils/dbUtils.js";
import FormatUtils from "#utils/formatUtils.js";

// Config
import config from "#config/env.js";

// Constants
import { NotificationTypes } from "#constants/generalConstants.js";
import { ItemTypes } from "@shared-constants/constants";

// Lazy import to avoid circular dependency
async function _createNotification(...args) {
  const { createNotification } = await import("#controllers/notificationController.js");
  return createNotification(...args);
}

/**
 * Trash Service
 * Handles automated cleanup and management of trashed items.
 */
export const autoPurgeExpiredItems = async () => {
  logger.info("🧹 Initiating Smart Trash Cleanup...");

  try {
    const expiryDays = config.TRASH_EXPIRY_DAYS;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - expiryDays);

    // 1. Find all expired folders (manually deleted)
    const expiredFolders = await Folder.find({
      is_deleted: true,
      deleted_directly: true,
      deleted_at: { $lte: expiryDate },
    });

    // 2. Find all expired files (manually deleted)
    const expiredFiles = await File.find({
      is_deleted: true,
      deleted_directly: true,
      deleted_at: { $lte: expiryDate },
    });

    if (expiredFolders.length === 0 && expiredFiles.length === 0) {
      logger.info("✨ No expired trash items found.");
      return;
    }

    // Group items by user to send aggregate notifications
    const userStats = {}; // { userId: { freedBytes: 0, itemsCount: 0 } }

    // Process Folders
    for (const folder of expiredFolders) {
      const userId = folder.user.toString();
      if (!userStats[userId]) {
        userStats[userId] = { freedBytes: 0, itemsCount: 0, user: null };
      }

      // Calculate size before deletion (recursively find all files in this folder)
      const folderFiles = await File.find({ folder: folder._id, is_deleted: true });
      const folderSize = folderFiles.reduce((acc, f) => acc + f.size_bytes, 0);

      userStats[userId].freedBytes += folderSize;
      userStats[userId].itemsCount += 1; // Count as 1 major item (the folder)

      logger.info(`Auto-purging expired folder: ${folder.name} for user ${userId}`);
      await DbUtils.permanentDeleteRecursive(ItemTypes.FOLDER, folder._id, folder.user);
    }

    // Process Files
    for (const file of expiredFiles) {
      const userId = file.user.toString();
      if (!userStats[userId]) {
        userStats[userId] = { freedBytes: 0, itemsCount: 0, user: null };
      }

      userStats[userId].freedBytes += file.size_bytes;
      userStats[userId].itemsCount += 1;

      logger.info(`Auto-purging expired file: ${file.name} for user ${userId}`);
      await DbUtils.permanentDeleteRecursive(ItemTypes.FILE, file._id, file.user);
    }

    // Notify users of recovered space
    for (const [userId, stats] of Object.entries(userStats)) {
      if (stats.itemsCount === 0) {
        continue;
      }

      const user = await User.findById(userId);
      if (!user) {
        continue;
      }

      const humanSize = FormatUtils.formatStorageSize(stats.freedBytes);
      const title = "Trash Cleanup Complete";
      const message = `We've permanently deleted ${stats.itemsCount} expired items from your trash, freeing up ${humanSize} of storage.`;

      // In-app notification
      await _createNotification(userId, NotificationTypes.TRASH_CLEANUP, title, message).catch((err) => {
        logger.error(`[Trash Cleanup] Notification failed for user ${userId}:`, err);
      });

      // Email notification
      if (user.email) {
        logger.info(`[Trash Cleanup] Sending email to ${user.email}`);
        EmailService.sendTemplateEmail({
          email: user.email,
          subject: "Your storage has been optimized 🧹",
          templateName: "trash-summary",
          plainTextMessage: message,
          data: {
            userName: user.name,
            freedAmount: humanSize,
            itemCount: stats.itemsCount,
            actionUrl: `${config.APP_BASE_URL}/quota`,
          },
        }).catch((err) => logger.error(`[Trash Cleanup Email] Failed for ${user.email}:`, err));
      }
    }

    logger.info("✅ Smart Trash Cleanup completed.");
  } catch (err) {
    logger.error("❌ Smart Trash Cleanup failed:", err);
    throw err;
  }
};

const TrashService = {
  autoPurgeExpiredItems,
};

export default TrashService;

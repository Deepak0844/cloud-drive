// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import User from "#models/User.js";

// Services
import EmailService from "#services/emailService.js";
import NotificationService from "#services/notificationService.js";

// Constants
import { NotificationMessages, NotificationTypes } from "#constants/generalConstants.js";
import { ItemTypes } from "@shared-constants/constants";

// Config
import config from "#config/env.js";

// Utils
import DbUtils from "#utils/dbUtils.js";
import FormatUtils from "#utils/formatUtils.js";
import logger from "#utils/logger.js";
import { applyAdvancedFilters, escapeRegex } from "#utils/filterUtils.js";
import { paginateQuery } from "#utils/paginationUtils.js";

/**
 * Trash Service
 * Handles automated cleanup and management of trashed items.
 */

/**
 * Returns all directly-deleted files and folders for a user with search and pagination.
 *
 * @param {string} userId
 * @param {object} query  - Express req.query object (search, pg, ps, sort/filter params)
 * @returns {Promise<{ folders: object[], files: object[], pagination: object }>}
 */
async function getTrashItems(userId, query) {
  const { search, pg, ps } = query;

  let folderQuery = { user: userId, is_deleted: true, deleted_directly: true };
  if (search && search !== "null" && search !== "undefined") {
    folderQuery.name = { $regex: escapeRegex(search), $options: "i" };
  }
  folderQuery = applyAdvancedFilters(folderQuery, query, true);

  const fileQuery = { user: userId, is_deleted: true, deleted_directly: true };
  if (search && search !== "null" && search !== "undefined") {
    fileQuery.name = { $regex: escapeRegex(search), $options: "i" };
  }
  const fileQueryPaginated = applyAdvancedFilters({ ...fileQuery }, query, false);

  const [folders, fileResult] = await Promise.all([
    Folder.find(folderQuery).sort("-deleted_at"),
    paginateQuery(File, fileQueryPaginated, { pg, ps, sort: "-deleted_at" }),
  ]);

  // Dynamically resolve itemCount for each folder
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const fileCount = await File.countDocuments({ folder: folder._id, is_deleted: true });
      const subfolderCount = await Folder.countDocuments({ parent: folder._id, is_deleted: true });
      return {
        ...folder.toObject(),
        id: folder._id,
        itemCount: fileCount + subfolderCount,
      };
    })
  );

  return {
    folders: foldersWithCount,
    files: fileResult.data,
    pagination: fileResult.pagination,
  };
}

/**
 * Restores the given items (and their descendants) from the trash.
 *
 * @param {string} userId
 * @param {Array<{ id: string, type: string }>} items
 */
async function restoreItems(userId, items) {
  await Promise.all(
    items.filter((item) => item.id && item.type).map((item) => DbUtils.restoreRecursive(item.type, item.id, userId))
  );
}

/**
 * Permanently deletes the given items (and their descendants).
 *
 * @param {string} userId
 * @param {Array<{ id: string, type: string }>} items
 */
async function deleteItemsPermanently(userId, items) {
  await Promise.all(
    items
      .filter((item) => item.id && item.type)
      .map((item) => DbUtils.permanentDeleteRecursive(item.type, item.id, userId))
  );
}

/**
 * Empties the entire trash for a user.
 *
 * @param {string} userId
 * @returns {Promise<boolean>} false if already empty, true if items were deleted
 */
async function emptyTrash(userId) {
  const [folders, files] = await Promise.all([
    Folder.find({ user: userId, is_deleted: true, deleted_directly: true }),
    File.find({ user: userId, is_deleted: true, deleted_directly: true }),
  ]);

  const itemsToDelete = [
    ...folders.map((f) => ({ id: f._id, type: ItemTypes.FOLDER })),
    ...files.map((f) => ({ id: f._id, type: ItemTypes.FILE })),
  ];

  if (itemsToDelete.length === 0) {
    return false;
  }

  await Promise.all(itemsToDelete.map((item) => DbUtils.permanentDeleteRecursive(item.type, item.id, userId)));
  return true;
}

/**
 * Auto-purge items that have been in the trash longer than TRASH_EXPIRY_DAYS.
 * Runs on a cron schedule (see app.js / systemService.js).
 */
async function autoPurgeExpiredItems() {
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
      const title = NotificationMessages.TRASH_CLEANUP_COMPLETE;
      const message = `We've permanently deleted ${stats.itemsCount} expired items from your trash, freeing up ${humanSize} of storage.`;

      // In-app notification
      await NotificationService.createNotification(userId, NotificationTypes.TRASH_CLEANUP, title, message).catch(
        (err) => {
          logger.error(`[Trash Cleanup] Notification failed for user ${userId}:`, err);
        }
      );

      // Email notification
      if (user.email) {
        logger.info(`[Trash Cleanup] Sending email to ${user.email}`);
        EmailService.sendTemplateEmail({
          email: user.email,
          subject: NotificationMessages.TRASH_EMAIL_SUBJECT,
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
}

const TrashService = {
  getTrashItems,
  restoreItems,
  deleteItemsPermanently,
  emptyTrash,
  autoPurgeExpiredItems,
};

export default TrashService;

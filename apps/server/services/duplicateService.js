// Models
import File from "#models/File.js";

// Services
import NotificationService from "#services/notificationService.js";

// Constants
import { NotificationMessages, NotificationTypes } from "#constants/generalConstants.js";

// Utils
import logger from "#utils/logger.js";

// Services
import MetadataService from "#services/metadataService.js";

/**
 * Scan all files and populate missing hashes
 */
async function syncHashes() {
  const filesWithoutHash = await File.find({ hash: { $exists: false }, is_deleted: false });
  logger.info(`[Duplicates] Syncing hashes for ${filesWithoutHash.length} files...`);

  for (const file of filesWithoutHash) {
    try {
      const hash = await MetadataService.calculateHash(file.storage_path);
      await File.findByIdAndUpdate(file._id, { $set: { hash } });
    } catch (err) {
      logger.error(`[Duplicates] Failed to hash file ${file.name}: ${err.message}`);
    }
  }
}

/**
 * Find duplicates for all users and notify them
 */
async function findAndNotifyDuplicates() {
  await syncHashes();

  try {
    const duplicateHashes = await File.aggregate([
      { $match: { is_deleted: false, hash: { $exists: true, $ne: null } } },
      { $group: { _id: { user: "$user", hash: "$hash" }, count: { $sum: 1 }, files: { $push: "$name" } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicateHashes.length === 0) {
      logger.info("[Duplicates] No duplicates found.");
      return;
    }

    // Group by user
    const userDuplicates = {};
    duplicateHashes.forEach((dup) => {
      const userId = String(dup._id.user);
      if (!userDuplicates[userId]) {
        userDuplicates[userId] = [];
      }
      userDuplicates[userId].push(dup);
    });

    for (const userId of Object.keys(userDuplicates)) {
      const dups = userDuplicates[userId];
      const totalDupSets = dups.length;
      const totalFilesCount = dups.reduce((acc, curr) => acc + curr.count, 0);

      await NotificationService.createNotification(
        userId,
        NotificationTypes.SYSTEM_ALERT,
        NotificationMessages.DUPLICATE_FILES_FOUND,
        `We found ${totalFilesCount} duplicate files across ${totalDupSets} sets of content. View your files to optimize storage.`
      );

      logger.info(`[Duplicates] Notified user ${userId} about ${totalFilesCount} duplicates.`);
    }
  } catch (err) {
    logger.error("[Duplicates] Cron job failed:", err.message);
  }
}

const DuplicateService = {
  findAndNotifyDuplicates,
  syncHashes,
};

export default DuplicateService;

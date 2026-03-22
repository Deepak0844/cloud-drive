import si from "systeminformation";

// Models
import User from "#models/User.js";
import File from "#models/File.js";

// Utils
import logger from "#utils/logger.js";

/**
 * Get real-time hardware information
 */
async function getHardwareStats() {
  try {
    const [cpu, temp, mem, disk] = await Promise.all([si.currentLoad(), si.cpuTemperature(), si.mem(), si.fsSize()]);

    // Format CPU load
    const cpuLoad = cpu.currentLoad.toFixed(2);

    // Get the disk mounted at '/' (root), falling back to the largest disk
    const mainDisk =
      disk.find((d) => d.mount === "/") ||
      disk.reduce((a, b) => (a.size > b.size ? a : b), { use: 0, size: 0, used: 0 });

    return {
      cpu: {
        load: cpuLoad,
        temp: temp.main || "N/A",
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usage_percent: ((mem.used / mem.total) * 100).toFixed(2),
      },
      disk: {
        total: mainDisk.size,
        used: mainDisk.used,
        available: mainDisk.size - mainDisk.used,
        usage_percent: mainDisk.use.toFixed(2),
      },
    };
  } catch (err) {
    logger.error("Failed to fetch hardware stats:", err.message);
    throw err;
  }
}

/**
 * Get storage analytics across all users
 */
async function getStorageAnalytics() {
  try {
    const userStats = await User.aggregate([
      {
        $project: {
          name: 1,
          email: 1,
          used_bytes: 1,
          quota_bytes: 1,
          usage_percent: {
            $cond: [
              { $gt: ["$quota_bytes", 0] },
              { $multiply: [{ $divide: ["$used_bytes", "$quota_bytes"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { used_bytes: -1 } },
      { $limit: 10 }, // Top 10 users by storage
    ]);

    const globalStats = await File.aggregate([
      { $match: { is_deleted: false } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          total_size: { $sum: "$size_bytes" },
        },
      },
    ]);

    return {
      top_users: userStats,
      category_distribution: globalStats,
    };
  } catch (err) {
    logger.error("Failed to fetch storage analytics:", err.message);
    throw err;
  }
}

const SystemService = {
  getHardwareStats,
  getStorageAnalytics,
};

export default SystemService;

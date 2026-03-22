import si from "systeminformation";

// Models
import User from "#models/User.js";
import File from "#models/File.js";
import QuotaRequest from "#models/QuotaRequest.js";

// Config
import Env from "#config/env.js";

// Constants
import { Roles, QuotaStatus } from "@shared-constants/constants";

// Utils
import logger from "#utils/logger.js";

// ---------------------------------------------------------------------------
// Hardware stats in-memory cache
// The socket interval primes this every 5s so REST calls return instantly.
// ---------------------------------------------------------------------------
const HARDWARE_CACHE_TTL_MS = 10_000; // accept data up to 10s old
let _hwCache = null;
let _hwCacheAt = 0;
let _hwInflight = null; // deduplicate concurrent fetches

async function _fetchHardwareStats() {
  const [cpu, temp, mem, disk] = await Promise.all([si.currentLoad(), si.cpuTemperature(), si.mem(), si.fsSize()]);

  const cpuLoad = cpu.currentLoad.toFixed(2);
  const temperature =
    temp.main ?? temp.max ?? (Array.isArray(temp.cores) && temp.cores.length > 0 ? temp.cores[0] : null);

  const storagePath = Env.NAS_STORAGE_PATH;
  const storageDisk =
    disk
      .filter((d) => storagePath.startsWith(d.mount))
      .reduce((best, d) => (!best || d.mount.length > best.mount.length ? d : best), null) ??
    disk.find((d) => d.mount === "/") ??
    disk.reduce((a, b) => (a.size > b.size ? a : b), { use: 0, size: 0, used: 0, mount: "unknown" });

  return {
    cpu: {
      load: cpuLoad,
      temp: temperature !== null && temperature !== undefined ? temperature : "N/A",
      collected_at: new Date().toISOString(),
    },
    memory: {
      total: mem.total,
      used: mem.active,
      free: mem.available,
      usage_percent: ((mem.active / mem.total) * 100).toFixed(2),
    },
    disk: {
      path: storageDisk.mount,
      total: storageDisk.size,
      used: storageDisk.used,
      available: storageDisk.size - storageDisk.used,
      usage_percent: storageDisk.use.toFixed(2),
    },
  };
}

/**
 * Get real-time hardware information
 * Returns cached value if within TTL; otherwise fetches fresh (deduplicating concurrent calls).
 */
async function getHardwareStats() {
  try {
    // Return cached value if still fresh
    if (_hwCache && Date.now() - _hwCacheAt < HARDWARE_CACHE_TTL_MS) {
      return _hwCache;
    }

    // Deduplicate concurrent fetches
    if (!_hwInflight) {
      _hwInflight = _fetchHardwareStats()
        .then((result) => {
          _hwCache = result;
          _hwCacheAt = Date.now();
          _hwInflight = null;
          return result;
        })
        .catch((err) => {
          _hwInflight = null;
          throw err;
        });
    }

    return await _hwInflight;
  } catch (err) {
    logger.error("Failed to fetch hardware stats:", err.message);
    // Return stale cache rather than crashing the response
    if (_hwCache) {
      return _hwCache;
    }
    throw err;
  }
}

/**
 * Get comprehensive dashboard analytics
 */
async function getDashboardStats() {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [userAgg, fileAgg, quotaAgg] = await Promise.all([
      // ── User stats + storage overview in one pass ──────────────────────────────
      User.aggregate([
        { $match: { role: Roles.USER } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ["$is_active", 1, 0] } },
            new_7d: { $sum: { $cond: [{ $gte: ["$createdAt", last7d] }, 1, 0] } },
            new_30d: { $sum: { $cond: [{ $gte: ["$createdAt", last30d] }, 1, 0] } },
            total_used_bytes: { $sum: "$used_bytes" },
            total_allocated_bytes: { $sum: "$quota_bytes" },
            above_80_percent: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $gt: ["$quota_bytes", 0] }, { $gte: [{ $divide: ["$used_bytes", "$quota_bytes"] }, 0.8] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // ── File stats in one pass ─────────────────────────────────────────────────
      File.aggregate([
        {
          $group: {
            _id: null,
            total_size_bytes: { $sum: { $cond: [{ $eq: ["$is_deleted", false] }, "$size_bytes", 0] } },
            uploads_24h: {
              $sum: {
                $cond: [{ $and: [{ $eq: ["$is_deleted", false] }, { $gte: ["$createdAt", last24h] }] }, 1, 0],
              },
            },
            uploads_7d: {
              $sum: {
                $cond: [{ $and: [{ $eq: ["$is_deleted", false] }, { $gte: ["$createdAt", last7d] }] }, 1, 0],
              },
            },
            uploads_30d: {
              $sum: {
                $cond: [{ $and: [{ $eq: ["$is_deleted", false] }, { $gte: ["$createdAt", last30d] }] }, 1, 0],
              },
            },
          },
        },
      ]),

      // ── Quota request counts by status + resolved this month ──────────────────
      QuotaRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            this_month: { $sum: { $cond: [{ $gte: ["$updatedAt", startOfMonth] }, 1, 0] } },
          },
        },
      ]),
    ]);

    // Flatten user aggregate result
    const u = userAgg[0] ?? {
      total: 0,
      active: 0,
      new_7d: 0,
      new_30d: 0,
      total_used_bytes: 0,
      total_allocated_bytes: 0,
      above_80_percent: 0,
    };

    // Flatten file aggregate result
    const f = fileAgg[0] ?? {
      total_size_bytes: 0,
      uploads_24h: 0,
      uploads_7d: 0,
      uploads_30d: 0,
    };

    // Flatten quota aggregate result
    const quotaMap = Object.fromEntries(quotaAgg.map((q) => [q._id, { count: q.count, this_month: q.this_month }]));

    return {
      user_stats: {
        total: u.total,
        active: u.active,
        inactive: u.total - u.active,
        new_last_7d: u.new_7d,
        new_last_30d: u.new_30d,
      },
      storage_overview: {
        total_used_bytes: u.total_used_bytes,
        total_allocated_bytes: u.total_allocated_bytes,
        utilization_percent:
          u.total_allocated_bytes > 0 ? ((u.total_used_bytes / u.total_allocated_bytes) * 100).toFixed(2) : "0.00",
        users_above_80_percent: u.above_80_percent,
      },
      file_stats: {
        total_size_bytes: f.total_size_bytes,
        uploads_last_24h: f.uploads_24h,
        uploads_last_7d: f.uploads_7d,
        uploads_last_30d: f.uploads_30d,
      },
      quota_requests: {
        pending: quotaMap[QuotaStatus.PENDING]?.count ?? 0,
        approved_this_month: quotaMap[QuotaStatus.APPROVED]?.this_month ?? 0,
        rejected_this_month: quotaMap[QuotaStatus.REJECTED]?.this_month ?? 0,
        total_approved: quotaMap[QuotaStatus.APPROVED]?.count ?? 0,
        total_rejected: quotaMap[QuotaStatus.REJECTED]?.count ?? 0,
      },
    };
  } catch (err) {
    logger.error("Failed to fetch dashboard stats:", err.message);
    throw err;
  }
}

const SystemService = {
  getHardwareStats,
  getDashboardStats,
};

export default SystemService;

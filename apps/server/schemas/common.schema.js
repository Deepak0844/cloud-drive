import { z } from "zod";

// ─── Shared Primitives ───────────────────────────────────────────────────────

/**
 * Reusable validator for MongoDB ObjectId strings.
 * Used in `:id` param schemas across all route files.
 */
export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

// ─── Notifications ────────────────────────────────────────────────────────────

export const registerPushTokenSchema = z.object({
  body: z.object({
    // Minimum length guards against trivially invalid tokens (FCM/APNs tokens are 100+ chars)
    token: z.string().min(20, "Push token is too short"),
  }),
});

export const webPushSubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url("Invalid push endpoint"),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(10),
    }),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// ─── Quota ────────────────────────────────────────────────────────────────────

export const requestQuotaIncreaseSchema = z.object({
  body: z.object({
    requested_bytes: z.number().positive("Requested bytes must be a positive number"),
    reason: z.string().optional(),
  }),
});

// ─── Trash ────────────────────────────────────────────────────────────────────

const trashItemSchema = z.object({
  id: objectIdSchema,
  type: z.enum(["file", "folder"]),
});

export const trashRestoreSchema = z.object({
  body: z.object({
    items: z.array(trashItemSchema).min(1, "At least one item is required"),
  }),
});

export const trashPermanentDeleteSchema = trashRestoreSchema;

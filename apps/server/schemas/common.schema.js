import { z } from "zod";

// Notifications
export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Push token is required"),
  }),
});

// Quota
export const requestQuotaIncreaseSchema = z.object({
  body: z.object({
    requested_bytes: z.number().positive("Requested bytes must be a positive number"),
    reason: z.string().optional(),
  }),
});

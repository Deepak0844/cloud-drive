import { z } from "zod";

export const updateUserQuotaSchema = z.object({
  body: z.object({
    quota_bytes: z.number().positive("Quota must be a positive number"),
  }),
});

export const handleQuotaRequestSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    admin_note: z.string().optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    is_active: z.boolean(),
  }),
});

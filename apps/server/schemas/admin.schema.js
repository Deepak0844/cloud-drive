import { z } from "zod";

export const getUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    pg: z.coerce.number().int().positive().optional(),
    ps: z.coerce.number().int().positive().optional(),
  }),
});

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

export const rotateKeySchema = z.object({
  body: z.object({
    newKey: z
      .string()
      .length(64, "New master key must be exactly 64 hex characters")
      .regex(/^[0-9a-f]+$/i, "New master key must be a valid hex string"),
  }),
});

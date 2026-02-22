import { z } from "zod";

export const renameFileSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
  }),
});

export const moveFileSchema = z.object({
  body: z.object({
    folderId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
  }),
});

export const copyFileSchema = moveFileSchema;

export const uploadFileSchema = z.object({
  body: z.object({
    folderId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
  }),
});

export const bulkDeleteSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          type: z.enum(["file", "folder"]),
          id: z.string(),
        })
      )
      .min(1, "Items array is required"),
  }),
});

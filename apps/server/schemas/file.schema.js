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

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID is required"),
  }),
});

export const getFilesSchema = z.object({
  query: z.object({
    folderId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
    search: z.string().optional(),
    category: z.enum(["image", "video", "audio", "document", "archive", "other"]).optional(),
    extension: z.string().optional(),
    isFavorite: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    minSize: z.string().optional(),
    maxSize: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    recursive: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    pn: z.string().optional(),
    pg: z.string().optional(),
    ps: z.string().optional(),
  }),
});

export const getRecentFilesSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 20)),
    category: z.enum(["image", "video", "audio", "document", "archive", "other"]).optional(),
  }),
});

export const updateTagsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID is required"),
  }),
  body: z.object({
    tags: z.array(z.string()).min(1, "At least one tag is required"),
  }),
});

export const favoriteFileSchema = idParamSchema;

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

export const bulkMoveSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          type: z.enum(["file", "folder"]),
          id: z.string(),
        })
      )
      .min(1, "Items array is required"),
    targetFolderId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
  }),
});

export const bulkCopySchema = bulkMoveSchema;

export const bulkDownloadSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          type: z.enum(["file", "folder"]),
          id: z.string(),
        })
      )
      .min(1, "At least one item is required"),
  }),
});

import { z } from "zod";
import { objectIdSchema } from "#schemas/common.schema.js";

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Folder name is required"),
    parent: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
  }),
});

export const renameFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Folder name is required"),
  }),
});

export const moveFolderSchema = z.object({
  body: z.object({
    parentId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
  }),
});

export const copyFolderSchema = moveFolderSchema;

export const folderIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const getFoldersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    parentId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "null" || val === "" ? null : val)),
    tag: z.string().optional(),
    isFavorite: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});
export const favoriteFolderSchema = folderIdParamSchema;

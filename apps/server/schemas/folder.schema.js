import { z } from "zod";

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
    id: z.string().min(1, "Folder ID is required"),
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
  }),
});

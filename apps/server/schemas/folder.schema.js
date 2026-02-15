import { z } from "zod";

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Folder name is required"),
    parent: z.string().nullable().optional(),
  }),
});

export const renameFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Folder name is required"),
  }),
});

export const moveFolderSchema = z.object({
  body: z.object({
    parentId: z.string().nullable().optional(),
  }),
});

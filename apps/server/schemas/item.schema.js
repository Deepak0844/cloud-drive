import { z } from "zod";

export const bulkOperationSchema = z.object({
  body: z.object({
    action: z.enum(["delete", "restore", "permanent_delete", "move", "copy"]),
    items: z
      .array(
        z.object({
          type: z.enum(["file", "folder"]),
          id: z.string(),
        })
      )
      .min(1, "Items array is required"),
    destination_folder_id: z.string().nullable().optional(),
  }),
});

import { z } from "zod";

export const initChunkedUploadSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, "File name is required"),
    totalChunks: z.number().int().positive("Total chunks must be a positive integer"),
    fileSize: z.number().int().positive("File size must be a positive integer"),
    folderId: z.string().nullable().optional(),
  }),
});

// Chunk metadata arrives as query params (?uploadId=<id>&chunkIndex=<n>)
// because the request body is occupied by raw binary chunk data.
export const uploadChunkSchema = z.object({
  query: z.object({
    uploadId: z.string().min(1, "Upload ID is required"),
    chunkIndex: z.coerce.number().int().nonnegative("Chunk index must be a non-negative integer"),
  }),
});

export const finalizeChunkedUploadSchema = z.object({
  body: z.object({
    uploadId: z.string().min(1, "Upload ID is required"),
    fileName: z.string().min(1, "File name is required"),
    folderId: z.string().nullable().optional(),
    mimeType: z.string().optional(),
    totalSize: z.number().int().positive().optional(),
  }),
});

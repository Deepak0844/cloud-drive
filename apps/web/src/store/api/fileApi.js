import baseApi from "./baseApi";
import ApiUtils from "./apiUtils";
import { TagIds, TagTypes } from "@/constants/apiTags";
import HttpClientFactory from "@/utils/httpClientFactory";

const CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB

/**
 * Send a single chunk as raw binary using XHR for real onUploadProgress events.
 * Metadata goes in query params — no FormData serialization.
 */
function uploadChunkRaw({ uploadId, chunkIndex, buffer, signal, onProgress, authToken }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("canceled"));

    const xhr = new XMLHttpRequest();
    const url = `/api/v1/files/upload/chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}`;

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({});
        }
      } else {
        reject(new Error(`Chunk ${chunkIndex} failed: HTTP ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error(`Network error on chunk ${chunkIndex}`));
    xhr.onabort = () => reject(new Error("canceled"));

    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(buffer);
  });
}

/**
 * File API endpoints.
 */
const fileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/files
    getFiles: builder.query({
      query: (params) => ({
        url: "/files",
        params,
      }),
      providesTags: ApiUtils.paginatedTags(TagTypes.FILES),
    }),

    // GET /api/v1/files/recent
    getRecentFiles: builder.query({
      query: (params) => ({
        url: "/files/recent",
        params,
      }),
      providesTags: ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    }),

    // POST /api/v1/files/upload/init
    initChunkedUpload: builder.mutation({
      query: (body) => ({
        url: "/files/upload/init",
        method: "POST",
        body,
      }),
    }),

    // POST /api/v1/files/upload/finalize
    finalizeChunkedUpload: builder.mutation({
      query: (body) => ({
        url: "/files/upload/finalize",
        method: "POST",
        body,
      }),
      // Note: The actual /upload/chunk route is called directly via Axios in useChunkedUpload.js
      // to support the onUploadProgress listener. Once finalized, we invalidate lists here.
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/upload
    uploadFile: builder.mutation({
      query: (formData) => ({
        url: "/files/upload",
        method: "POST",
        body: formData,
        // FormData is handled by browser/axios, but we can specify contentType if needed
        // customBaseQuery uses HttpClient which handles contentType
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS), // Invalidate folder contents if uploaded to a folder
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // Custom Mutation for Chunked Upload
    uploadFileChunked: builder.mutation({
      async queryFn(
        { file, folderId, initData, state, onProgressFn, onSpeedEtaUpdate },
        _queryApi,
        _extraOptions,
        fetchWithBQ
      ) {
        const { signal } = _queryApi;
        const httpClient = HttpClientFactory.getInstance();
        const authToken = httpClient.authToken;

        try {
          // ── Branch 1: Small file (≤ CHUNK_SIZE) ──────────────────────────────
          if (file.size <= CHUNK_SIZE) {
            const formData = new FormData();
            formData.append("file", file);
            if (folderId) formData.append("folderId", folderId);

            await httpClient.post("/api/v1/files/upload", {}, formData, null, {
              signal,
              onUploadProgress: (pe) => {
                if (pe.lengthComputable) {
                  const progress = Math.round((pe.loaded / file.size) * 100);
                  if (onProgressFn) onProgressFn(progress, pe.loaded);
                }
              },
            });

            if (onProgressFn) onProgressFn(100, file.size);
            return { data: { success: true } };
          }

          // ── Branch 2: Chunked upload ──────────────────────────────────────────

          if (!state.uploadId) {
            state.uploadId = initData.uploadId;
            state.totalChunks = initData.totalChunks;
          }

          while (state.currentChunkIndex < state.totalChunks) {
            if (signal.aborted) return { error: { message: "canceled" } };

            const start = state.currentChunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const blob = file.slice(start, end);
            const buffer = await blob.arrayBuffer();

            const bytesBeforeThisChunk = state.uploadedBytes;

            await uploadChunkRaw({
              uploadId: state.uploadId,
              chunkIndex: state.currentChunkIndex,
              buffer,
              signal,
              authToken,
              onProgress: (loaded) => {
                const totalSoFar = bytesBeforeThisChunk + loaded;
                const prog = Math.min(Math.round((totalSoFar / file.size) * 100), 99);
                if (onProgressFn) onProgressFn(prog, totalSoFar);
              },
            });

            state.currentChunkIndex++;
            state.uploadedBytes += end - start;
            const overallProg = Math.round((state.uploadedBytes / file.size) * 100);
            if (onProgressFn) onProgressFn(overallProg, state.uploadedBytes);
          }

          // Finalize
          if (onSpeedEtaUpdate) onSpeedEtaUpdate(0, null);
          const finalizeRes = await fetchWithBQ({
            url: "/files/upload/finalize",
            method: "POST",
            body: {
              uploadId: state.uploadId,
              fileName: file.name,
              folderId,
              mimeType: file.type,
              totalSize: file.size,
            },
          });

          if (finalizeRes.error) throw finalizeRes.error;

          if (onProgressFn) onProgressFn(100, file.size);
          return { data: { success: true } };
        } catch (error) {
          if (error.message === "canceled" || signal.aborted) {
            return { error: { message: "canceled" } };
          }
          return { error: { message: error.message || "Upload failed" } };
        }
      },
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // DELETE /api/v1/files/:id
    deleteFile: builder.mutation({
      query: ({ id }) => ({
        url: `/files/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ...ApiUtils.listTags(TagTypes.TRASH),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // PATCH /api/v1/files/:id
    renameFile: builder.mutation({
      query: ({ id, name }) => ({
        url: `/files/${id}`,
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // PATCH /api/v1/files/:id/favorite
    toggleFileFavorite: builder.mutation({
      query: ({ id }) => ({
        url: `/files/${id}/favorite`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/:id/move
    moveFile: builder.mutation({
      query: ({ id, folderId }) => ({
        url: `/files/${id}/move`,
        method: "POST",
        body: { folderId },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/:id/copy
    copyFile: builder.mutation({
      query: ({ id, folderId }) => ({
        url: `/files/${id}/copy`,
        method: "POST",
        body: { folderId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/bulk-delete
    bulkDelete: builder.mutation({
      query: ({ items }) => ({
        url: "/files/bulk-delete",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ...ApiUtils.listTags(TagTypes.TRASH),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/bulk-move
    bulkMove: builder.mutation({
      query: ({ items, targetFolderId }) => ({
        url: "/files/bulk-move",
        method: "POST",
        body: { items, targetFolderId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/bulk-copy
    bulkCopy: builder.mutation({
      query: ({ items, targetFolderId }) => ({
        url: "/files/bulk-copy",
        method: "POST",
        body: { items, targetFolderId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/bulk-download
    bulkDownload: builder.mutation({
      query: ({ items }) => ({
        url: "/files/bulk-download",
        method: "POST",
        body: { items },
        responseHandler: "blob",
        cache: "no-cache",
      }),
    }),

    // PATCH /api/v1/files/:id/tags
    updateFileTags: builder.mutation({
      query: ({ id, tags }) => ({
        url: `/files/${id}/tags`,
        method: "PATCH",
        body: { tags },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/:id/touch
    touchFile: builder.mutation({
      query: ({ id }) => ({
        url: `/files/${id}/touch`,
        method: "POST",
      }),
      invalidatesTags: [TagTypes.FILES, TagTypes.RECENT_FILES],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFilesQuery,
  useGetRecentFilesQuery,
  useUploadFileMutation,
  useUploadFileChunkedMutation,
  useInitChunkedUploadMutation,
  useFinalizeChunkedUploadMutation,
  useDeleteFileMutation,
  useRenameFileMutation,
  useToggleFileFavoriteMutation,
  useMoveFileMutation,
  useCopyFileMutation,
  useBulkDeleteMutation,
  useBulkMoveMutation,
  useBulkCopyMutation,
  useBulkDownloadMutation,
  useUpdateFileTagsMutation,
  useTouchFileMutation,
} = fileApi;

export default fileApi;

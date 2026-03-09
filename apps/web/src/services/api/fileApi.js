import baseApi from "./api";

// Utils
import ApiUtils from "./apiUtils";
import HttpClientFactory from "@utils/httpClientFactory";
import { uploadChunkRaw } from "@utils/chunkUploadUtils";
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

const CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB

/**
 * File API endpoints.
 */
const fileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/files
    getFiles: builder.query({
      query: (params) => ({
        url: FileServiceUrls.getFileList,
        params,
      }),
      // Only cache based on search/extensions/folder, ignore page 'pg' for cache key
      serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
      merge: ApiUtils.mergePaginatedArrays(),
      providesTags: ApiUtils.paginatedTags(TagTypes.FILES),
    }),

    // GET /api/v1/files/recent
    getRecentFiles: builder.query({
      query: (params) => ({
        url: FileServiceUrls.getRecentFileList,
        params,
      }),
      serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
      merge: ApiUtils.mergePaginatedArrays(),
      providesTags: ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    }),

    // POST /api/v1/files/upload/init
    initChunkedUpload: builder.mutation({
      query: (body) => ({
        url: FileServiceUrls.initChunkedUpload,
        method: "POST",
        body,
      }),
    }),

    // POST /api/v1/files/upload/finalize
    finalizeChunkedUpload: builder.mutation({
      query: (body) => ({
        url: FileServiceUrls.finalizeChunkedUpload,
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
        url: FileServiceUrls.uploadFile,
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

            await httpClient.post(`${ApiBasePath}${FileServiceUrls.uploadFile}`, {}, formData, null, {
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
            url: FileServiceUrls.finalizeChunkedUpload,
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
        url: UrlUtils.format(FileServiceUrls.deleteFile, { id }),
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
        url: UrlUtils.format(FileServiceUrls.renameFile, { id }),
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
        url: UrlUtils.format(FileServiceUrls.toggleFavorite, { id }),
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
        url: UrlUtils.format(FileServiceUrls.moveFile, { id }),
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
        url: UrlUtils.format(FileServiceUrls.copyFile, { id }),
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

    // PATCH /api/v1/files/:id/tags
    updateFileTags: builder.mutation({
      query: ({ id, tags }) => ({
        url: UrlUtils.format(FileServiceUrls.updateFileTags, { id }),
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
        url: UrlUtils.format(FileServiceUrls.touchFile, { id }),
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
  useUpdateFileTagsMutation,
  useTouchFileMutation,
} = fileApi;

export default fileApi;

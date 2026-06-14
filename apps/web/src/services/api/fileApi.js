// Utils
import ApiUtils from "./apiUtils";
import HttpClientFactory from "@utils/httpClientFactory";
import FileTransformer from "./fileTransformer";
import ChunkUploadUtils from "@utils/chunkUploadUtils";
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { FileServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";
import { UPLOAD_CHUNK_SIZE } from "@shared-constants/constants";
import { DEFAULT_CHUNK_SIZE } from "@constants/uiConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getFilesQuery = () => ({
  query: (params) => ({
    url: FileServiceUrls.getFileList,
    params,
  }),
  transformResponse: FileTransformer.transformFileList,
  serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: ApiUtils.paginatedTags(TagTypes.FILES),
});

const getRecentFilesQuery = () => ({
  query: (params) => ({
    url: FileServiceUrls.getRecentFileList,
    params,
  }),
  transformResponse: FileTransformer.transformFileList,
  serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
});

const initChunkedUploadMutation = () => ({
  query: (body) => ({
    url: FileServiceUrls.initChunkedUpload,
    method: HttpMethods.POST,
    body,
    // Upload errors must never redirect to the error page — they surface in the upload drawer.
    onError: { suppressGlobalError: true },
  }),
  transformResponse: (res) => res.data,
});

const finalizeChunkedUploadMutation = () => ({
  query: (body) => ({
    url: FileServiceUrls.finalizeChunkedUpload,
    method: HttpMethods.POST,
    body,
    onError: { suppressGlobalError: true },
  }),
  invalidatesTags: [
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
    TagTypes.QUOTA,
    TagTypes.ADMIN_STATS,
    TagTypes.ADMIN_USERS,
  ],
});

const uploadFileMutation = () => ({
  query: (formData) => ({
    url: FileServiceUrls.uploadFile,
    method: HttpMethods.POST,
    body: formData,
    onError: { suppressGlobalError: true },
  }),
  invalidatesTags: [
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
    TagTypes.QUOTA,
    TagTypes.ADMIN_STATS,
    TagTypes.ADMIN_USERS,
  ],
});

const uploadFileChunkedMutation = () => ({
  async queryFn(
    { file, folderId, initData, state, onProgressFn, onSpeedEtaUpdate },
    _queryApi,
    _extraOptions,
    fetchWithBQ
  ) {
    const { signal } = _queryApi;
    const httpClient = HttpClientFactory.getInstance();

    try {
      const safeChunkSize = UPLOAD_CHUNK_SIZE || DEFAULT_CHUNK_SIZE;

      if (file.size <= safeChunkSize) {
        await ChunkUploadUtils.uploadSingleFile({ httpClient, file, folderId, signal, onProgressFn });
        return { data: { success: true } };
      }

      if (!state.uploadId && initData) {
        if (initData.__resume) {
          // Resuming a cross-session upload — server confirmed these chunk indices exist on disk.
          // uploadedChunkSet is read by uploadFileInChunks to skip already-received chunks.
          state.uploadId = initData.uploadId;
          state.totalChunks = initData.totalChunks;
          state.uploadedChunkSet = new Set(initData.uploadedChunks || []);
        } else {
          // Normal fresh-start path
          const { uploadId, totalChunks } = initData || {};
          state.uploadId = uploadId;
          state.totalChunks = totalChunks;
        }
      }

      if (file.size > safeChunkSize && (!state.uploadId || !state.totalChunks)) {
        throw new Error("Missing upload session metadata. Please retry.");
      }

      await ChunkUploadUtils.uploadFileInChunks({
        file,
        state,
        signal,
        onProgressFn,
        chunkSize: safeChunkSize,
      });

      if (onSpeedEtaUpdate) {
        onSpeedEtaUpdate(0, null);
      }
      const finalizeRes = await fetchWithBQ({
        url: FileServiceUrls.finalizeChunkedUpload,
        method: HttpMethods.POST,
        body: {
          uploadId: state.uploadId,
          fileName: file.name,
          folderId: folderId && folderId !== "null" ? folderId : null,
          mimeType: file.type,
          totalSize: file.size,
        },
      });

      if (finalizeRes.error) {
        throw finalizeRes.error;
      }

      if (onProgressFn) {
        onProgressFn(100, file.size);
      }
      return { data: { success: true } };
    } catch (error) {
      if (error.message === "canceled" || signal.aborted) {
        return { error: { message: "canceled" } };
      }
      // Extract the server-side message (axios wraps it in error.response.data)
      const serverMessage = error?.data?.message || error?.response?.data?.message || error.message || "Upload failed";
      return { error: { message: serverMessage } };
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
});

const deleteFileMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FileServiceUrls.deleteFile, { id }),
    method: HttpMethods.DELETE,
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
});

const renameFileMutation = () => ({
  query: ({ id, name }) => ({
    url: UrlUtils.format(FileServiceUrls.renameFile, { id }),
    method: HttpMethods.PATCH,
    body: { name },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const toggleFileFavoriteMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FileServiceUrls.toggleFavorite, { id }),
    method: HttpMethods.PATCH,
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const moveFileMutation = () => ({
  query: ({ id, folderId }) => ({
    url: UrlUtils.format(FileServiceUrls.moveFile, { id }),
    method: HttpMethods.POST,
    body: { folderId },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const copyFileMutation = () => ({
  query: ({ id, folderId }) => ({
    url: UrlUtils.format(FileServiceUrls.copyFile, { id }),
    method: HttpMethods.POST,
    body: { folderId },
    onError: { suppressGlobalError: true },
  }),
  invalidatesTags: [
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
    TagTypes.QUOTA,
    TagTypes.ADMIN_STATS,
    TagTypes.ADMIN_USERS,
  ],
});

const updateFileTagsMutation = () => ({
  query: ({ id, tags }) => ({
    url: UrlUtils.format(FileServiceUrls.updateFileTags, { id }),
    method: HttpMethods.PATCH,
    body: { tags },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const touchFileMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FileServiceUrls.touchFile, { id }),
    method: HttpMethods.POST,
  }),
  invalidatesTags: [TagTypes.FILES],
});

const getPlaybackInfoQuery = () => ({
  query: (fileId) => ({
    url: UrlUtils.format(FileServiceUrls.playbackInfo, { id: fileId }),
  }),
  // Cache playback info for 5 minutes; it rarely changes
  keepUnusedDataFor: 300,
});

// Query the server for which chunks of an in-progress upload already exist on disk.
// Used by UploadContext to restore a session after page reload.
const getChunkUploadStatusQuery = () => ({
  query: (uploadId) => ({
    url: `${FileServiceUrls.uploadChunkStatus}?uploadId=${encodeURIComponent(uploadId)}`,
  }),
  transformResponse: (res) => res.data,
  // Never serve a stale response — always hit the server on resume
  keepUnusedDataFor: 0,
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const fileApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFiles: builder.query(getFilesQuery()),
    getRecentFiles: builder.query(getRecentFilesQuery()),
    getChunkUploadStatus: builder.query(getChunkUploadStatusQuery()),
    initChunkedUpload: builder.mutation(initChunkedUploadMutation()),
    finalizeChunkedUpload: builder.mutation(finalizeChunkedUploadMutation()),
    uploadFile: builder.mutation(uploadFileMutation()),
    uploadFileChunked: builder.mutation(uploadFileChunkedMutation()),
    deleteFile: builder.mutation(deleteFileMutation()),
    renameFile: builder.mutation(renameFileMutation()),
    toggleFileFavorite: builder.mutation(toggleFileFavoriteMutation()),
    moveFile: builder.mutation(moveFileMutation()),
    copyFile: builder.mutation(copyFileMutation()),
    updateFileTags: builder.mutation(updateFileTagsMutation()),
    touchFile: builder.mutation(touchFileMutation()),
    getPlaybackInfo: builder.query(getPlaybackInfoQuery()),
  }),
  overrideExisting: false,
});

export const {
  useGetFilesQuery,
  useGetRecentFilesQuery,
  useGetChunkUploadStatusQuery,
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
  useGetPlaybackInfoQuery,
} = fileApi;

export default fileApi;

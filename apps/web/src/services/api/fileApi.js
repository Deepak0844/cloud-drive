// Utils
import ApiUtils from "./apiUtils";
import HttpClientFactory from "@utils/httpClientFactory";
import { uploadSingleFile, uploadFileInChunks } from "@utils/chunkUploadUtils";
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { FileServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";
import { UPLOAD_CHUNK_SIZE } from "@shared-constants/constants";

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
  serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: ApiUtils.paginatedTags(TagTypes.FILES),
});

const getRecentFilesQuery = () => ({
  query: (params) => ({
    url: FileServiceUrls.getRecentFileList,
    params,
  }),
  serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
});

const initChunkedUploadMutation = () => ({
  query: (body) => ({
    url: FileServiceUrls.initChunkedUpload,
    method: HttpMethods.POST,
    body,
  }),
});

const finalizeChunkedUploadMutation = () => ({
  query: (body) => ({
    url: FileServiceUrls.finalizeChunkedUpload,
    method: HttpMethods.POST,
    body,
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
    const authToken = httpClient.authToken;

    try {
      const safeChunkSize = UPLOAD_CHUNK_SIZE || 10 * 1000 * 1000;

      if (file.size <= safeChunkSize) {
        await uploadSingleFile({ httpClient, file, folderId, signal, onProgressFn });
        return { data: { success: true } };
      }

      if (!state.uploadId && initData) {
        // Correctly access .data property from server response
        const { uploadId, totalChunks } = initData.data || {};
        state.uploadId = uploadId;
        state.totalChunks = totalChunks;
      }

      if (file.size > safeChunkSize && (!state.uploadId || !state.totalChunks)) {
        throw new Error("Missing upload session metadata. Please retry.");
      }

      await uploadFileInChunks({
        file,
        state,
        signal,
        authToken,
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

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const fileApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFiles: builder.query(getFilesQuery()),
    getRecentFiles: builder.query(getRecentFilesQuery()),
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

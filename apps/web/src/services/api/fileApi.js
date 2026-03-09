// Utils
import ApiUtils from "./apiUtils";
import HttpClientFactory from "@utils/httpClientFactory";
import { uploadChunkRaw } from "@utils/chunkUploadUtils";
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

const CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB

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

      if (onSpeedEtaUpdate) onSpeedEtaUpdate(0, null);
      const finalizeRes = await fetchWithBQ({
        url: FileServiceUrls.finalizeChunkedUpload,
        method: HttpMethods.POST,
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

// Shared API instance
import { api } from "@rtkQuery/api";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { FileUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import FileTransformer from "./fileTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getFilesQuery = () => ({
  query: (params) => ({ url: FileUrls.list, params }),
  transformResponse: FileTransformer.transformFileList,
  providesTags: [ApiTagTypes.FILES],
});

const getRecentFilesQuery = () => ({
  query: (params) => ({ url: FileUrls.recent, params }),
  transformResponse: FileTransformer.transformFileList,
  providesTags: [ApiTagTypes.FILES],
});

const deleteFileMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FileUrls.delete, { id }),
    method: HttpMethods.delete,
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
});

const renameFileMutation = () => ({
  query: ({ id, name }) => ({
    url: UrlUtils.format(FileUrls.rename, { id }),
    method: HttpMethods.patch,
    body: { name },
  }),
  transformResponse: FileTransformer.transformFile,
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS],
});

const toggleFileFavoriteMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FileUrls.toggleFavorite, { id }),
    method: HttpMethods.patch,
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.FAVORITES],
});

const moveFileMutation = () => ({
  query: ({ id, folderId }) => ({
    url: UrlUtils.format(FileUrls.move, { id }),
    method: HttpMethods.post,
    body: { folderId },
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS],
});

const copyFileMutation = () => ({
  query: ({ id, folderId }) => ({
    url: UrlUtils.format(FileUrls.copy, { id }),
    method: HttpMethods.post,
    body: { folderId },
    suppressGlobalError: true,
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const fileApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFiles: builder.query(getFilesQuery()),
    getRecentFiles: builder.query(getRecentFilesQuery()),
    deleteFile: builder.mutation(deleteFileMutation()),
    renameFile: builder.mutation(renameFileMutation()),
    toggleFileFavorite: builder.mutation(toggleFileFavoriteMutation()),
    moveFile: builder.mutation(moveFileMutation()),
    copyFile: builder.mutation(copyFileMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetFilesQuery,
  useGetRecentFilesQuery,
  useDeleteFileMutation,
  useRenameFileMutation,
  useToggleFileFavoriteMutation,
  useMoveFileMutation,
  useCopyFileMutation,
} = fileApi;

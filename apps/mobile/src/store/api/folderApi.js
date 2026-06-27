// Shared API instance
import { api } from "@rtkQuery/api";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { FolderUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import FolderTransformer from "./folderTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getFolderContentsQuery = () => ({
  query: ({ id }) => ({
    url: id === "root" ? FolderUrls.rootContents : UrlUtils.format(FolderUrls.contents, { id }),
  }),
  transformResponse: FolderTransformer.transformFolderContents,
  providesTags: [ApiTagTypes.FOLDERS, ApiTagTypes.FILES],
});

const getFoldersQuery = () => ({
  query: () => ({ url: FolderUrls.list }),
  transformResponse: FolderTransformer.transformFolderList,
  providesTags: [ApiTagTypes.FOLDERS],
});

const getFolderDetailsQuery = () => ({
  query: ({ id }) => ({ url: UrlUtils.format(FolderUrls.details, { id }) }),
  transformResponse: FolderTransformer.transformFolderDetails,
  providesTags: [ApiTagTypes.FOLDERS],
});

const createFolderMutation = () => ({
  query: (body) => ({
    url: FolderUrls.create,
    method: HttpMethods.post,
    body,
  }),
  transformResponse: (response) => response.data,
  invalidatesTags: [ApiTagTypes.FOLDERS],
});

const renameFolderMutation = () => ({
  query: ({ id, name }) => ({
    url: UrlUtils.format(FolderUrls.rename, { id }),
    method: HttpMethods.patch,
    body: { name },
  }),
  invalidatesTags: [ApiTagTypes.FOLDERS],
});

const deleteFolderMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FolderUrls.delete, { id }),
    method: HttpMethods.delete,
  }),
  invalidatesTags: [ApiTagTypes.FOLDERS, ApiTagTypes.FILES, ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
});

const moveFolderMutation = () => ({
  query: ({ id, parentId }) => ({
    url: UrlUtils.format(FolderUrls.move, { id }),
    method: HttpMethods.post,
    body: { parentId },
  }),
  invalidatesTags: [ApiTagTypes.FOLDERS],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const folderApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFolderContents: builder.query(getFolderContentsQuery()),
    getFolders: builder.query(getFoldersQuery()),
    getFolderDetails: builder.query(getFolderDetailsQuery()),
    createFolder: builder.mutation(createFolderMutation()),
    renameFolder: builder.mutation(renameFolderMutation()),
    deleteFolder: builder.mutation(deleteFolderMutation()),
    moveFolder: builder.mutation(moveFolderMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetFolderContentsQuery,
  useGetFoldersQuery,
  useGetFolderDetailsQuery,
  useCreateFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useMoveFolderMutation,
} = folderApi;

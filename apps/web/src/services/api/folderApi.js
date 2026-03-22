// Utils
import ApiUtils from "./apiUtils";
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { FolderServiceUrls, ROOT_FOLDER_ID } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getFoldersQuery = () => ({
  query: (params) => ({
    url: FolderServiceUrls.getFolderList,
    params,
  }),
  providesTags: ApiUtils.paginatedTags(TagTypes.FOLDERS),
});

const getFolderContentsQuery = () => ({
  query: (arg) => {
    const id = typeof arg === "string" ? arg : arg?.folderId || ROOT_FOLDER_ID;
    const params = typeof arg === "object" ? { ...arg } : {};
    delete params.folderId;

    return {
      url:
        id === ROOT_FOLDER_ID || !id
          ? FolderServiceUrls.getRootFolderContents
          : UrlUtils.format(FolderServiceUrls.getFolderContents, { id }),
      params,
    };
  },
  serializeQueryArgs: ApiUtils.serializeFolderContentsQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: (result, error, arg) => {
    const id = typeof arg === "string" ? arg : arg?.folderId || ROOT_FOLDER_ID;
    return [
      ...ApiUtils.listTags(TagTypes.FOLDERS, id || "ROOT"),
      ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
    ];
  },
});

const getFolderDetailsQuery = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FolderServiceUrls.getFolderDetails, { id }),
  }),
  providesTags: (result, error, arg) => ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
});

const createFolderMutation = () => ({
  query: (folderData) => ({
    url: FolderServiceUrls.createFolder,
    method: HttpMethods.POST,
    body: folderData,
  }),
  invalidatesTags: [...ApiUtils.listTags(TagTypes.FOLDERS), ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS)],
});

const renameFolderMutation = () => ({
  query: ({ id, name }) => ({
    url: UrlUtils.format(FolderServiceUrls.renameFolder, { id }),
    method: HttpMethods.PATCH,
    body: { name },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const deleteFolderMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FolderServiceUrls.deleteFolder, { id }),
    method: HttpMethods.DELETE,
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.TRASH),
  ],
});

const toggleFolderFavoriteMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(FolderServiceUrls.toggleFavorite, { id }),
    method: HttpMethods.PATCH,
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const moveFolderMutation = () => ({
  query: ({ id, parentId }) => ({
    url: UrlUtils.format(FolderServiceUrls.moveFolder, { id }),
    method: HttpMethods.POST,
    body: { parentId },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const copyFolderMutation = () => ({
  query: ({ id, parentId }) => ({
    url: UrlUtils.format(FolderServiceUrls.copyFolder, { id }),
    method: HttpMethods.POST,
    body: { parentId },
    onError: { suppressGlobalError: true },
  }),
  invalidatesTags: [...ApiUtils.listTags(TagTypes.FOLDERS), ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS)],
});

const updateFolderTagsMutation = () => ({
  query: ({ id, tags }) => ({
    url: UrlUtils.format(FolderServiceUrls.updateFolderTags, { id }),
    method: HttpMethods.PATCH,
    body: { tags },
  }),
  invalidatesTags: (result, error, arg) => [
    ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const folderApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFolders: builder.query(getFoldersQuery()),
    getFolderContents: builder.query(getFolderContentsQuery()),
    getFolderDetails: builder.query(getFolderDetailsQuery()),
    createFolder: builder.mutation(createFolderMutation()),
    renameFolder: builder.mutation(renameFolderMutation()),
    deleteFolder: builder.mutation(deleteFolderMutation()),
    toggleFolderFavorite: builder.mutation(toggleFolderFavoriteMutation()),
    moveFolder: builder.mutation(moveFolderMutation()),
    copyFolder: builder.mutation(copyFolderMutation()),
    updateFolderTags: builder.mutation(updateFolderTagsMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetFoldersQuery,
  useGetFolderContentsQuery,
  useGetFolderDetailsQuery,
  useCreateFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useToggleFolderFavoriteMutation,
  useMoveFolderMutation,
  useCopyFolderMutation,
  useUpdateFolderTagsMutation,
} = folderApi;

export default folderApi;

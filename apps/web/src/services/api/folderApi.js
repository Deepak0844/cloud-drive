import baseApi from "./api";
import ApiUtils from "./apiUtils";
import { TagIds, TagTypes } from "@constants/apiTags";
import { FolderServiceUrls } from "@constants/serviceUrls";
import { UrlUtils } from "@shared-utils/utils";

/**
 * Folder API endpoints.
 */
const folderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/folders
    getFolders: builder.query({
      query: (params) => ({
        url: FolderServiceUrls.getFolderList,
        params,
      }),
      providesTags: ApiUtils.paginatedTags(TagTypes.FOLDERS),
    }),

    // GET /api/v1/folders/:id/contents
    getFolderContents: builder.query({
      query: (arg) => {
        const id = typeof arg === "string" ? arg : arg?.folderId || "root";
        const params = typeof arg === "object" ? { ...arg } : {};
        delete params.folderId;

        return {
          url:
            id === "root" || !id
              ? FolderServiceUrls.getRootFolderContents
              : UrlUtils.format(FolderServiceUrls.getFolderContents, { id }),
          params,
        };
      },
      serializeQueryArgs: ApiUtils.serializeFolderContentsQueryArgs,
      merge: ApiUtils.mergePaginatedArrays(),
      providesTags: (result, error, arg) => {
        const id = typeof arg === "string" ? arg : arg?.folderId || "root";
        return [
          ...ApiUtils.listTags(TagTypes.FOLDERS, id || "ROOT"),
          ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ];
      },
    }),

    // GET /api/v1/folders/:id
    getFolderDetails: builder.query({
      query: ({ id }) => ({
        url: UrlUtils.format(FolderServiceUrls.getFolderDetails, { id }),
      }),
      providesTags: (result, error, arg) => ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    }),

    // POST /api/v1/folders
    createFolder: builder.mutation({
      query: (folderData) => ({
        url: FolderServiceUrls.createFolder,
        method: "POST",
        body: folderData,
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // PATCH /api/v1/folders/:id
    renameFolder: builder.mutation({
      query: ({ id, name }) => ({
        url: UrlUtils.format(FolderServiceUrls.renameFolder, { id }),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // DELETE /api/v1/folders/:id
    deleteFolder: builder.mutation({
      query: ({ id }) => ({
        url: UrlUtils.format(FolderServiceUrls.deleteFolder, { id }),
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.TRASH),
      ],
    }),

    // PATCH /api/v1/folders/:id/favorite
    toggleFolderFavorite: builder.mutation({
      query: ({ id }) => ({
        url: UrlUtils.format(FolderServiceUrls.toggleFavorite, { id }),
        method: "PATCH",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/folders/:id/move
    moveFolder: builder.mutation({
      query: ({ id, parentId }) => ({
        url: UrlUtils.format(FolderServiceUrls.moveFolder, { id }),
        method: "POST",
        body: { parentId },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/folders/:id/copy
    copyFolder: builder.mutation({
      query: ({ id, parentId }) => ({
        url: UrlUtils.format(FolderServiceUrls.copyFolder, { id }),
        method: "POST",
        body: { parentId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // PATCH /api/v1/folders/:id/tags
    updateFolderTags: builder.mutation({
      query: ({ id, tags }) => ({
        url: UrlUtils.format(FolderServiceUrls.updateFolderTags, { id }),
        method: "PATCH",
        body: { tags },
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),
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

import baseApi from "./baseApi";
import ApiUtils from "./apiUtils";
import { TagIds, TagTypes } from "@/constants/apiTags";

/**
 * Folder API endpoints.
 */
const folderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/folders
    getFolders: builder.query({
      query: (params) => ({
        url: "/folders",
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
          url: id === "root" || !id ? "/folders/root/contents" : `/folders/${id}/contents`,
          params,
        };
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const id = typeof queryArgs === "string" ? queryArgs : queryArgs?.folderId || "root";
        const { pg: _pg, ...rest } = typeof queryArgs === "object" ? queryArgs : {};
        delete rest.folderId;
        return `${endpointName}-${id}-${JSON.stringify(rest)}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg?.pg || arg.pg === 1) return newItems;
        return {
          ...newItems,
          folders: [...currentCache.folders, ...newItems.folders],
          files: [...currentCache.files, ...newItems.files],
        };
      },
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
        url: `/folders/${id}`,
      }),
      providesTags: (result, error, arg) => ApiUtils.entityTags(TagTypes.FOLDERS)(result, error, arg),
    }),

    // POST /api/v1/folders
    createFolder: builder.mutation({
      query: (folderData) => ({
        url: "/folders",
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
        url: `/folders/${id}`,
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
        url: `/folders/${id}`,
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
        url: `/folders/${id}/favorite`,
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
        url: `/folders/${id}/move`,
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
        url: `/folders/${id}/copy`,
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
        url: `/folders/${id}/tags`,
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

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
      query: (id) => ({
        url: id === "root" || !id ? "/folders/root/contents" : `/folders/${id}/contents`,
      }),
      providesTags: (result, error, id) => [
        ...ApiUtils.listTags(TagTypes.FOLDERS, id || "ROOT"),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
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
      ],
    }),

    // PATCH /api/v1/folders/:id/favorite
    toggleFavorite: builder.mutation({
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
  useToggleFavoriteMutation,
} = folderApi;

export default folderApi;

import baseApi from "./baseApi";
import ApiUtils from "./apiUtils";
import { TagIds, TagTypes } from "@/constants/apiTags";

/**
 * File API endpoints.
 */
const fileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/files
    getFiles: builder.query({
      query: (params) => ({
        url: "/files",
        params,
      }),
      providesTags: ApiUtils.paginatedTags(TagTypes.FILES),
    }),

    // GET /api/v1/files/recent
    getRecentFiles: builder.query({
      query: (params) => ({
        url: "/files/recent",
        params,
      }),
      providesTags: ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    }),

    // POST /api/v1/files/upload/init
    initChunkedUpload: builder.mutation({
      query: (body) => ({
        url: "/files/upload/init",
        method: "POST",
        body,
      }),
    }),

    // POST /api/v1/files/upload/finalize
    finalizeChunkedUpload: builder.mutation({
      query: (body) => ({
        url: "/files/upload/finalize",
        method: "POST",
        body,
      }),
      // Note: The actual /upload/chunk route is called directly via Axios in useChunkedUpload.js
      // to support the onUploadProgress listener. Once finalized, we invalidate lists here.
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/upload
    uploadFile: builder.mutation({
      query: (formData) => ({
        url: "/files/upload",
        method: "POST",
        body: formData,
        // FormData is handled by browser/axios, but we can specify contentType if needed
        // customBaseQuery uses HttpClient which handles contentType
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS), // Invalidate folder contents if uploaded to a folder
      ],
    }),

    // DELETE /api/v1/files/:id
    deleteFile: builder.mutation({
      query: ({ id }) => ({
        url: `/files/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // PATCH /api/v1/files/:id
    renameFile: builder.mutation({
      query: ({ id, name }) => ({
        url: `/files/${id}`,
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
    toggleFavorite: builder.mutation({
      query: ({ id }) => ({
        url: `/files/${id}/favorite`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, arg) => [
        ...ApiUtils.entityTags(TagTypes.FILES)(result, error, arg),
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFilesQuery,
  useGetRecentFilesQuery,
  useUploadFileMutation,
  useInitChunkedUploadMutation,
  useFinalizeChunkedUploadMutation,
  useDeleteFileMutation,
  useRenameFileMutation,
  useToggleFavoriteMutation,
} = fileApi;

export default fileApi;

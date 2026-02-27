import baseApi from "./baseApi";
import { TagTypes, TagIds } from "@/constants/apiTags";
import ApiUtils from "./apiUtils";

export const trashApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrashItems: builder.query({
      query: () => "/trash",
      providesTags: (result, error, arg) => ApiUtils.paginatedTags(TagTypes.TRASH)(result, error, arg),
    }),

    restoreItems: builder.mutation({
      query: (items) => ({
        url: "/trash/restore",
        method: "POST",
        body: { items },
      }),
      // Invalidate both Trash and standard Files/Folders since items moved back to main drive
      invalidatesTags: (result, error) => {
        if (error) return [];
        return [
          TagTypes.FILES,
          TagTypes.FOLDERS,
          ...ApiUtils.listTags(TagTypes.TRASH),
          ...ApiUtils.listTags(TagTypes.FILES),
          ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
          ...ApiUtils.listTags(TagTypes.FOLDERS),
          ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ];
      },
    }),

    permanentlyDeleteItems: builder.mutation({
      query: (items) => ({
        url: "/trash/permanent",
        method: "DELETE",
        body: { items },
      }),
      invalidatesTags: [...ApiUtils.listTags(TagTypes.TRASH)],
    }),

    emptyTrash: builder.mutation({
      query: () => ({
        url: "/trash/empty",
        method: "DELETE",
      }),
      invalidatesTags: [...ApiUtils.listTags(TagTypes.TRASH)],
    }),
  }),
});

export const {
  useGetTrashItemsQuery,
  useRestoreItemsMutation,
  usePermanentlyDeleteItemsMutation,
  useEmptyTrashMutation,
} = trashApi;

import baseApi from "./api";
import { TagTypes, TagIds } from "@constants/apiTags";
import { TrashServiceUrls } from "@constants/serviceUrls";
import ApiUtils from "./apiUtils";

export const trashApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrashItems: builder.query({
      query: (params) => ({
        url: TrashServiceUrls.getTrashItems,
        params,
      }),
      serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
      // ApiUtils now dynamic traverses and merges all arrays it finds
      merge: ApiUtils.mergePaginatedArrays(),
      providesTags: ApiUtils.listTags(TagTypes.TRASH),
    }),

    restoreItems: builder.mutation({
      query: ({ items }) => ({
        url: TrashServiceUrls.restoreItems,
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
          TagTypes.QUOTA,
          TagTypes.ADMIN_STATS,
          TagTypes.ADMIN_USERS,
        ];
      },
    }),

    permanentlyDeleteItems: builder.mutation({
      query: ({ items }) => ({
        url: TrashServiceUrls.permanentlyDeleteItems,
        method: "DELETE",
        body: { items },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.TRASH),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    emptyTrash: builder.mutation({
      query: () => ({
        url: TrashServiceUrls.emptyTrash,
        method: "DELETE",
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.TRASH),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),
  }),
});

export const {
  useGetTrashItemsQuery,
  useRestoreItemsMutation,
  usePermanentlyDeleteItemsMutation,
  useEmptyTrashMutation,
} = trashApi;

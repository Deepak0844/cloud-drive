import baseApi from "./api";
import { TagTypes, TagIds } from "@constants/apiTags";
import ApiUtils from "./apiUtils";

export const trashApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrashItems: builder.query({
      query: (params) => ({
        url: "/trash",
        params,
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { pg: _pg, ...rest } = queryArgs || {};
        return `${endpointName}-${JSON.stringify(rest)}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg?.pg || arg.pg === 1) return newItems;
        return {
          ...newItems,
          files: [...currentCache.files, ...newItems.files],
          folders: newItems.folders, // folders typically not paginated here
        };
      },
      providesTags: ApiUtils.listTags(TagTypes.TRASH),
    }),

    restoreItems: builder.mutation({
      query: ({ items }) => ({
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
          TagTypes.QUOTA,
          TagTypes.ADMIN_STATS,
          TagTypes.ADMIN_USERS,
        ];
      },
    }),

    permanentlyDeleteItems: builder.mutation({
      query: ({ items }) => ({
        url: "/trash/permanent",
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
        url: "/trash/empty",
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

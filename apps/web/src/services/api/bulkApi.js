import baseApi from "./api";

// Utils
import ApiUtils from "./apiUtils";

// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { BulkServiceUrls } from "@constants/serviceUrls";

export const bulkApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/v1/files/bulk-delete
    bulkDelete: builder.mutation({
      query: ({ items }) => ({
        url: BulkServiceUrls.bulkDelete,
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        ...ApiUtils.listTags(TagTypes.TRASH),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/bulk-move
    bulkMove: builder.mutation({
      query: ({ items, targetFolderId }) => ({
        url: BulkServiceUrls.bulkMove,
        method: "POST",
        body: { items, targetFolderId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      ],
    }),

    // POST /api/v1/files/bulk-copy
    bulkCopy: builder.mutation({
      query: ({ items, targetFolderId }) => ({
        url: BulkServiceUrls.bulkCopy,
        method: "POST",
        body: { items, targetFolderId },
      }),
      invalidatesTags: [
        ...ApiUtils.listTags(TagTypes.FILES),
        ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
        ...ApiUtils.listTags(TagTypes.FOLDERS),
        ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
        TagTypes.QUOTA,
        TagTypes.ADMIN_STATS,
        TagTypes.ADMIN_USERS,
      ],
    }),

    // POST /api/v1/files/bulk-download
    bulkDownload: builder.mutation({
      query: ({ items }) => ({
        url: BulkServiceUrls.bulkDownload,
        method: "DOWNLOAD",
        downloadMethod: "POST",
        body: { items },
        responseType: "blob",
        cache: "no-cache",
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useBulkDeleteMutation, useBulkMoveMutation, useBulkCopyMutation, useBulkDownloadMutation } = bulkApi;

export default bulkApi;

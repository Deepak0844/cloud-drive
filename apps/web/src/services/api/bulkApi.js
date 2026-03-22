// Constants
import { TagIds, TagTypes } from "@constants/apiTags";
import { BulkServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Utils
import ApiUtils from "./apiUtils";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const bulkDeleteMutation = () => ({
  query: ({ items }) => ({
    url: BulkServiceUrls.bulkDelete,
    method: HttpMethods.POST,
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
});

const bulkMoveMutation = () => ({
  query: ({ items, targetFolderId }) => ({
    url: BulkServiceUrls.bulkMove,
    method: HttpMethods.POST,
    body: { items, targetFolderId },
  }),
  invalidatesTags: [
    ...ApiUtils.listTags(TagTypes.FILES),
    ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
    ...ApiUtils.listTags(TagTypes.FOLDERS),
    ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
  ],
});

const bulkCopyMutation = () => ({
  query: ({ items, targetFolderId }) => ({
    url: BulkServiceUrls.bulkCopy,
    method: HttpMethods.POST,
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
});

const bulkDownloadMutation = () => ({
  query: ({ items }) => ({
    url: BulkServiceUrls.bulkDownload,
    method: "DOWNLOAD", // Custom method handled by baseQuery/httpClient
    downloadMethod: HttpMethods.POST,
    body: { items },
    responseType: "blob",
    cache: "no-cache",
  }),
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const bulkApi = api.injectEndpoints({
  endpoints: (builder) => ({
    bulkDelete: builder.mutation(bulkDeleteMutation()),
    bulkMove: builder.mutation(bulkMoveMutation()),
    bulkCopy: builder.mutation(bulkCopyMutation()),
    bulkDownload: builder.mutation(bulkDownloadMutation()),
  }),
  overrideExisting: false,
});

export const { useBulkDeleteMutation, useBulkMoveMutation, useBulkCopyMutation, useBulkDownloadMutation } = bulkApi;

export default bulkApi;

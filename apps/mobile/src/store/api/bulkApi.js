// Shared API instance
import { api } from "@rtkQuery/api";

// Constants
import { BulkUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const bulkDeleteMutation = () => ({
  query: ({ items }) => ({
    url: BulkUrls.delete,
    method: HttpMethods.post,
    body: { items },
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
});

const bulkMoveMutation = () => ({
  query: ({ items, targetFolderId }) => ({
    url: BulkUrls.move,
    method: HttpMethods.post,
    body: { items, targetFolderId },
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS],
});

const bulkCopyMutation = () => ({
  query: ({ items, targetFolderId }) => ({
    url: BulkUrls.copy,
    method: HttpMethods.post,
    body: { items, targetFolderId },
    suppressGlobalError: true,
  }),
  invalidatesTags: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const bulkApi = api.injectEndpoints({
  endpoints: (builder) => ({
    bulkDelete: builder.mutation(bulkDeleteMutation()),
    bulkMove: builder.mutation(bulkMoveMutation()),
    bulkCopy: builder.mutation(bulkCopyMutation()),
  }),
  overrideExisting: false,
});

export const { useBulkDeleteMutation, useBulkMoveMutation, useBulkCopyMutation } = bulkApi;

// Constants
import { TagTypes } from "@constants/apiTags";
import { ItemServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const performBulkOperationMutation = () => ({
  query: (body) => ({
    url: ItemServiceUrls.performBulkOperation,
    method: HttpMethods.POST,
    body,
  }),
  invalidatesTags: [TagTypes.FILES, TagTypes.FOLDERS, TagTypes.TRASH, TagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const itemApi = api.injectEndpoints({
  endpoints: (builder) => ({
    performBulkOperation: builder.mutation(performBulkOperationMutation()),
  }),
  overrideExisting: false,
});

export const { usePerformBulkOperationMutation } = itemApi;

export default itemApi;

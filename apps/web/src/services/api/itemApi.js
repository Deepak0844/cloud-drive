import baseApi from "./api";
import { ItemServiceUrls } from "@constants/serviceUrls";

const itemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/v1/items/bulk-operation
    performBulkOperation: builder.mutation({
      query: (body) => ({
        url: ItemServiceUrls.performBulkOperation,
        method: "POST",
        body,
      }),
      invalidatesTags: ["File", "Folder", "Trash", "Quota"],
    }),
  }),
  overrideExisting: false,
});

export const { usePerformBulkOperationMutation } = itemApi;

export default itemApi;

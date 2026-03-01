import baseApi from "./baseApi";

const itemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/v1/items/bulk-operation
    performBulkOperation: builder.mutation({
      query: (body) => ({
        url: "/items/bulk-operation",
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

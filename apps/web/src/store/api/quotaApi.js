import baseApi from "./baseApi";

const quotaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/quota/usage
    getQuotaUsage: builder.query({
      query: () => ({
        url: "/quota/usage",
      }),
      providesTags: ["Quota"],
    }),

    // GET /api/v1/quota/breakdown
    getQuotaBreakdown: builder.query({
      query: () => ({
        url: "/quota/breakdown",
      }),
      providesTags: ["Quota"],
    }),

    // POST /api/v1/quota/request
    requestQuotaIncrease: builder.mutation({
      query: (body) => ({
        url: "/quota/request",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Quota"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery, useRequestQuotaIncreaseMutation } = quotaApi;

export default quotaApi;

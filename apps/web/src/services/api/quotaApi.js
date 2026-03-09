import baseApi from "./api";
import { TagTypes } from "@constants/apiTags";

const quotaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/quota/usage
    getQuotaUsage: builder.query({
      query: () => ({
        url: "/quota/usage",
      }),
      providesTags: [TagTypes.QUOTA],
    }),

    // GET /api/v1/quota/breakdown
    getQuotaBreakdown: builder.query({
      query: () => ({
        url: "/quota/breakdown",
      }),
      providesTags: [TagTypes.QUOTA],
    }),

    // POST /api/v1/quota/request
    requestQuotaIncrease: builder.mutation({
      query: (body) => ({
        url: "/quota/request",
        method: "POST",
        body,
      }),
      invalidatesTags: [TagTypes.QUOTA],
    }),
  }),
  overrideExisting: false,
});

export const { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery, useRequestQuotaIncreaseMutation } = quotaApi;

export default quotaApi;

import { createApi } from "@reduxjs/toolkit/query/react";

// custom base query
import customBaseQuery from "@/services/customBaseQuery";

/**
 * Base RTK Query API
 */
const baseApi = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery({
    baseUrl: "/api/v1",
  }),
  endpoints: () => ({}),
});

export default baseApi;

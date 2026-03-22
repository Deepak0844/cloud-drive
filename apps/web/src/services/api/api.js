// React core & third-party libraries
import { createApi } from "@reduxjs/toolkit/query/react";

// Services
import customBaseQuery from "@services/customBaseQuery";

// Constants
import { TagTypes } from "@constants/apiTags";
import { ApiBasePath } from "@constants/serviceUrls";

/**
 * Base RTK Query API
 */
const baseApi = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery({
    baseUrl: ApiBasePath,
  }),
  tagTypes: Object.values(TagTypes),
  endpoints: () => ({}),
});

export default baseApi;

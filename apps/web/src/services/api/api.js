import { createApi } from "@reduxjs/toolkit/query/react";

// custom base query
import customBaseQuery from "@services/customBaseQuery";

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

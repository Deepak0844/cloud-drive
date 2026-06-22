import { createApi } from "@reduxjs/toolkit/query/react";

// Constants
import { ApiTagTypes } from "@constants/generalConstants";

// Base Query
import { customBaseQuery } from "@rtkQuery/customBaseQuery";

export const api = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery,
  tagTypes: Object.values(ApiTagTypes),
  endpoints: () => ({}),
});

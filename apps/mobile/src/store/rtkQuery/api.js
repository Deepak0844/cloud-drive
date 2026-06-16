import { createApi } from "@reduxjs/toolkit/query/react";

// Base Query
import customBaseQuery from "@rtkQuery/customBaseQuery";
import { ApiTagTypes } from "@constants/generalConstants";

export const api = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery(),
  tagTypes: ApiTagTypes,
  endpoints: () => ({}),
});

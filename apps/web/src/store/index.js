// external
import { configureStore } from "@reduxjs/toolkit";

// api
import baseApi from "./api/baseApi";

// middleware
import rtkQueryErrorMiddleware from "./middleware/errorMiddleware";

/**
 * Redux store.
 *
 * The RTK Query `api` reducer manages all remote data caches.
 * There are no additional slices — auth state lives in localStorage.
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware, rtkQueryErrorMiddleware),
});

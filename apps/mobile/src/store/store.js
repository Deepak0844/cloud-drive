import { configureStore } from "@reduxjs/toolkit";

// Root reducer
import { RootReducer } from "@redux-slices/rootReducer";

// RTK Query API
import { api } from "@rtkQuery/api";

// Middleware
import { rtkQueryErrorMiddleware } from "@rtkQuery/rtkQueryErrorMiddleware";

const Store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(api.middleware, rtkQueryErrorMiddleware),
});
export default Store;

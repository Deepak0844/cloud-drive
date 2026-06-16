import { combineReducers } from "redux";

// RTK Query
import { api } from "@rtkQuery/api";

// Reducers
import { ErrorReducer } from "@redux-slices/errorSlice";

// Root Reducer definition
export const RootReducer = combineReducers({
  // RTK Query
  [api.reducerPath]: api.reducer,

  // Global error state
  Error: ErrorReducer,
});

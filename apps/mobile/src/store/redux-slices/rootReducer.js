import { combineReducers } from "redux";

// RTK Query
import { api } from "@rtkQuery/api";

// Reducers
import { ErrorReducer } from "@redux-slices/errorSlice";
import { AuthReducer } from "@redux-slices/authSlice";
import { ThemeReducer } from "@redux-slices/themeSlice";

export const RootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  Error: ErrorReducer,
  auth: AuthReducer,
  theme: ThemeReducer,
});

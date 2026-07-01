import { combineReducers } from "redux";

// RTK Query
import { api } from "@rtkQuery/api";

// Reducers
import { ErrorReducer } from "@redux-slices/errorSlice";
import { AuthReducer } from "@redux-slices/authSlice";
import { ThemeReducer } from "@redux-slices/themeSlice";
import OfflineReducer from "@redux-slices/offlineSlice";
import PhotoBackupReducer from "@redux-slices/photoBackupSlice";

export const RootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  Error: ErrorReducer,
  auth: AuthReducer,
  theme: ThemeReducer,
  offline: OfflineReducer,
  photoBackup: PhotoBackupReducer,
});

import { configureStore } from "@reduxjs/toolkit";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import TokenStorage from "@utils/tokenStorage";

// Root reducer
import { RootReducer } from "@redux-slices/rootReducer";

// RTK Query API
import { api } from "@rtkQuery/api";

// Middleware
import { rtkQueryErrorMiddleware } from "@rtkQuery/rtkQueryErrorMiddleware";
import { socketMiddleware } from "./middleware/socketMiddleware";

function _loadPhotoBackupState() {
  try {
    const raw = SecureStore.getItem("photoBackupState");
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

const Store = configureStore({
  reducer: RootReducer,
  preloadedState: {
    theme: { colorMode: SecureStore.getItem("colorMode") || Appearance.getColorScheme() || "dark" },
    auth: {
      isAuthenticated: Boolean(TokenStorage.getAccessTokenSync()),
      role: TokenStorage.getRoleSync() || null,
    },
    photoBackup: _loadPhotoBackupState(),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(api.middleware, rtkQueryErrorMiddleware, socketMiddleware),
});

let _prevPhotoBackup = Store.getState().photoBackup;
Store.subscribe(() => {
  const next = Store.getState().photoBackup;
  if (next !== _prevPhotoBackup) {
    _prevPhotoBackup = next;
    SecureStore.setItemAsync("photoBackupState", JSON.stringify(next));
  }
});

export default Store;

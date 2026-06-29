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

const Store = configureStore({
  reducer: RootReducer,
  preloadedState: {
    theme: { colorMode: SecureStore.getItem("colorMode") || Appearance.getColorScheme() || "dark" },
    auth: {
      isAuthenticated: Boolean(TokenStorage.getAccessTokenSync()),
      role: TokenStorage.getRoleSync() || null,
    },
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(api.middleware, rtkQueryErrorMiddleware, socketMiddleware),
});

export default Store;

import { Platform } from "react-native";

export const KeyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

// RTK Query cache tag types
export const ApiTagTypes = {
  FILES: "FILES",
  FOLDERS: "FOLDERS",
  TRASH: "TRASH",
  FAVORITES: "FAVORITES",
  NOTIFICATIONS: "NOTIFICATIONS",
  QUOTA: "QUOTA",
  USERS: "USERS",
};

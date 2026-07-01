import React from "react";
import { Image } from "expo-image";

// Utils
import TokenStorage from "@utils/tokenStorage";

export default function AuthImage({ uri = "", ...props }) {
  return <Image source={{ uri, headers: TokenStorage.getAuthHeaders() }} {...props} />;
}

import React from "react";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";

// Utils
import TokenStorage from "@utils/tokenStorage";

cssInterop(Image, { className: "style" });

export default function AuthImage({ uri = "", ...props }) {
  return <Image source={{ uri, headers: TokenStorage.getAuthHeaders() }} {...props} />;
}

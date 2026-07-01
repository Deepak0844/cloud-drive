import React from "react";
import { Dimensions, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Components
import AuthImage from "@components/media/AuthImage";

const { width, height } = Dimensions.get("window");
const viewerHeight = height * 0.55;

export default function ImageViewer({ uri = "" }) {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      className="items-center justify-center bg-black"
      style={{ width, height: viewerHeight }}
    >
      <AuthImage uri={uri} className="w-full h-full" contentFit="contain" transition={200} />
    </Pressable>
  );
}

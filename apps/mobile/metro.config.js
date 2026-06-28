const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, "sql"];
config.watchFolders = [path.resolve(__dirname, "../../shared")];
config.resolver.extraNodeModules = {
  // Points to src/ directly — Metro ignores package.json exports, consistent with @shared-hooks pattern
  "@shared-constants": path.resolve(__dirname, "../../shared/constants/src"),
  // Points to common/ — Metro ignores package.json exports; src/index.js pulls in browser-only LocalStorageUtils
  "@shared-utils/utils": path.resolve(__dirname, "../../shared/utils/common"),
  // Points to src/ directly — Metro ignores package.json exports, and shared/hooks has no root index.js
  "@shared-hooks": path.resolve(__dirname, "../../shared/hooks/src"),
};

module.exports = withNativeWind(wrapWithReanimatedMetroConfig(config), { input: "./global.css" });

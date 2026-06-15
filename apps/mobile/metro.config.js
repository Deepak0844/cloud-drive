const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, "sql"];
config.watchFolders = [path.resolve(__dirname, "../../shared")];
config.resolver.extraNodeModules = {
  "@shared-constants": path.resolve(__dirname, "../../shared/constants"),
  "@shared-utils": path.resolve(__dirname, "../../shared/utils"),
  "@shared-hooks": path.resolve(__dirname, "../../shared/hooks"),
};

module.exports = withNativeWind(wrapWithReanimatedMetroConfig(config), { input: "./global.css" });

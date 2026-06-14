import { getDefaultConfig } from "expo/metro-config";
import { withNativeWind } from "nativewind/metro";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, "../../shared")];
config.resolver.extraNodeModules = {
  "@shared-constants": path.resolve(__dirname, "../../shared/constants"),
  "@shared-utils": path.resolve(__dirname, "../../shared/utils"),
  "@shared-hooks": path.resolve(__dirname, "../../shared/hooks"),
};

export default withNativeWind(config, { input: "./global.css" });

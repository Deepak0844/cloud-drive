/**
 * @format
 */

import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import App from "./src/App";

SplashScreen.preventAutoHideAsync();

registerRootComponent(App);

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { AppScreens } from "@constants/appScreens";
import { useResponsive } from "@hooks/useResponsive";

import MyFilesScreen from "@screens/files/MyFilesScreen";
import PhotosScreen from "@screens/photos/PhotosScreen";
import RecentScreen from "@screens/recent/RecentScreen";
import FavoritesScreen from "@screens/favorites/FavoritesScreen";
import TrashScreen from "@screens/trash/TrashScreen";
import SearchScreen from "@screens/search/SearchScreen";
import SettingsScreen from "@screens/settings/SettingsScreen";
import AdminDashboardScreen from "@screens/admin/AdminDashboardScreen";
import AdminUsersScreen from "@screens/admin/AdminUsersScreen";
import AdminQuotaScreen from "@screens/admin/AdminQuotaScreen";

const FilesStack = createNativeStackNavigator();
function FilesStackNavigator() {
  return (
    <FilesStack.Navigator screenOptions={{ headerShown: false }}>
      <FilesStack.Screen name={AppScreens.MY_FILES} component={MyFilesScreen} />
    </FilesStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name={AppScreens.SETTINGS} component={SettingsScreen} />
      <MoreStack.Screen name={AppScreens.TRASH} component={TrashScreen} />
      <MoreStack.Screen name={AppScreens.SEARCH} component={SearchScreen} />
    </MoreStack.Navigator>
  );
}

const AdminStack = createNativeStackNavigator();
function AdminStackNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name={AppScreens.ADMIN_DASHBOARD} component={AdminDashboardScreen} />
      <AdminStack.Screen name={AppScreens.ADMIN_USERS} component={AdminUsersScreen} />
      <AdminStack.Screen name={AppScreens.ADMIN_QUOTA} component={AdminQuotaScreen} />
    </AdminStack.Navigator>
  );
}

const BottomTab = createBottomTabNavigator();
function PhoneNavigator() {
  return (
    <BottomTab.Navigator screenOptions={{ headerShown: false }}>
      <BottomTab.Screen name={AppScreens.FILES} component={FilesStackNavigator} />
      <BottomTab.Screen name={AppScreens.PHOTOS} component={PhotosScreen} />
      <BottomTab.Screen name={AppScreens.RECENT} component={RecentScreen} />
      <BottomTab.Screen name={AppScreens.FAVORITES} component={FavoritesScreen} />
      <BottomTab.Screen name={AppScreens.MORE} component={MoreStackNavigator} />
      <BottomTab.Screen name={AppScreens.ADMIN} component={AdminStackNavigator} />
    </BottomTab.Navigator>
  );
}

const Drawer = createDrawerNavigator();
function TabletNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen name={AppScreens.FILES} component={FilesStackNavigator} />
      <Drawer.Screen name={AppScreens.PHOTOS} component={PhotosScreen} />
      <Drawer.Screen name={AppScreens.RECENT} component={RecentScreen} />
      <Drawer.Screen name={AppScreens.FAVORITES} component={FavoritesScreen} />
      <Drawer.Screen name={AppScreens.MORE} component={MoreStackNavigator} />
      <Drawer.Screen name={AppScreens.ADMIN} component={AdminStackNavigator} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isTablet } = useResponsive();
  return isTablet ? <TabletNavigator /> : <PhoneNavigator />;
}

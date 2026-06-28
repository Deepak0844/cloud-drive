import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Folder, Image, Clock, Star, MoreHorizontal, ShieldCheck } from "lucide-react-native";

// Rtk
import { useGetMeQuery } from "@api/authApi";

// Constants
import { AppScreens } from "@constants/appScreens";
import { Roles } from "@shared-constants";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Theme
import { useTheme } from "@theme/useTheme";

// Screens
import MyFilesScreen from "@screens/files/MyFilesScreen";
import FolderScreen from "@screens/files/FolderScreen";
import FileDetailScreen from "@screens/files/FileDetailScreen";
import PhotosScreen from "@screens/photos/PhotosScreen";
import RecentScreen from "@screens/recent/RecentScreen";
import FavoritesScreen from "@screens/favorites/FavoritesScreen";
import TrashScreen from "@screens/trash/TrashScreen";
import SearchScreen from "@screens/search/SearchScreen";
import SettingsScreen from "@screens/settings/SettingsScreen";
import AdminDashboardScreen from "@screens/admin/AdminDashboardScreen";
import AdminUsersScreen from "@screens/admin/AdminUsersScreen";
import AdminQuotaScreen from "@screens/admin/AdminQuotaScreen";

function useIsAdmin() {
  const { data: me } = useGetMeQuery();
  return me?.role === Roles.ADMIN;
}

const FilesStack = createNativeStackNavigator();
function FilesStackNavigator() {
  return (
    <FilesStack.Navigator screenOptions={{ headerShown: false }}>
      <FilesStack.Screen name={AppScreens.MY_FILES} component={MyFilesScreen} />
      <FilesStack.Screen name={AppScreens.FOLDER} component={FolderScreen} />
      <FilesStack.Screen name={AppScreens.FILE_DETAIL} component={FileDetailScreen} />
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
  const { colors } = useTheme();
  const isAdmin = useIsAdmin();

  return (
    <BottomTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface.card,
          borderTopColor: colors.surface.border,
        },
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.neutral.DEFAULT,
      }}
    >
      <BottomTab.Screen
        name={AppScreens.FILES}
        component={FilesStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Folder color={color} size={size} /> }}
      />
      <BottomTab.Screen
        name={AppScreens.PHOTOS}
        component={PhotosScreen}
        options={{ tabBarIcon: ({ color, size }) => <Image color={color} size={size} /> }}
      />
      <BottomTab.Screen
        name={AppScreens.RECENT}
        component={RecentScreen}
        options={{ tabBarIcon: ({ color, size }) => <Clock color={color} size={size} /> }}
      />
      <BottomTab.Screen
        name={AppScreens.FAVORITES}
        component={FavoritesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Star color={color} size={size} /> }}
      />
      <BottomTab.Screen
        name={AppScreens.MORE}
        component={MoreStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }}
      />
      {isAdmin ? (
        <BottomTab.Screen
          name={AppScreens.ADMIN}
          component={AdminStackNavigator}
          options={{ tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} /> }}
        />
      ) : null}
    </BottomTab.Navigator>
  );
}

const Drawer = createDrawerNavigator();
function TabletNavigator() {
  const isAdmin = useIsAdmin();

  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen
        name={AppScreens.FILES}
        component={FilesStackNavigator}
        options={{ drawerIcon: ({ color, size }) => <Folder color={color} size={size} /> }}
      />
      <Drawer.Screen
        name={AppScreens.PHOTOS}
        component={PhotosScreen}
        options={{ drawerIcon: ({ color, size }) => <Image color={color} size={size} /> }}
      />
      <Drawer.Screen
        name={AppScreens.RECENT}
        component={RecentScreen}
        options={{ drawerIcon: ({ color, size }) => <Clock color={color} size={size} /> }}
      />
      <Drawer.Screen
        name={AppScreens.FAVORITES}
        component={FavoritesScreen}
        options={{ drawerIcon: ({ color, size }) => <Star color={color} size={size} /> }}
      />
      <Drawer.Screen
        name={AppScreens.MORE}
        component={MoreStackNavigator}
        options={{ drawerIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }}
      />
      {isAdmin ? (
        <Drawer.Screen
          name={AppScreens.ADMIN}
          component={AdminStackNavigator}
          options={{ drawerIcon: ({ color, size }) => <ShieldCheck color={color} size={size} /> }}
        />
      ) : null}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isTablet } = useResponsive();
  return isTablet ? <TabletNavigator /> : <PhoneNavigator />;
}

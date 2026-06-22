import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Folder, Image, Clock, Star, MoreHorizontal, ShieldCheck } from "lucide-react-native";
import { useSelector } from "react-redux";

// Constants
import { AppScreens } from "@constants/appScreens";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Theme
import { useTheme } from "@theme/useTheme";

// Screens
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
  const { colors } = useTheme();
  const isAdmin = useSelector((s) => s.auth.role === "ADMIN");

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
  const isAdmin = useSelector((s) => s.auth.role === "ADMIN");

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

import React from "react";
import { View } from "react-native";
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

// Components
import AuroraBackground from "@components/auth/AuroraBackground";
import GlassTabBar from "@components/navigation/GlassTabBar";

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

// ─── Stack Navigators ────────────────────────────────────────────────────────

const FilesStack = createNativeStackNavigator();
function FilesStackNavigator() {
  return (
    <FilesStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <FilesStack.Screen name={AppScreens.MY_FILES} component={MyFilesScreen} />
      <FilesStack.Screen name={AppScreens.FOLDER} component={FolderScreen} />
      <FilesStack.Screen name={AppScreens.FILE_DETAIL} component={FileDetailScreen} />
    </FilesStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <MoreStack.Screen name={AppScreens.SETTINGS} component={SettingsScreen} />
      <MoreStack.Screen name={AppScreens.TRASH} component={TrashScreen} />
      <MoreStack.Screen name={AppScreens.SEARCH} component={SearchScreen} />
    </MoreStack.Navigator>
  );
}

const AdminStack = createNativeStackNavigator();
function AdminStackNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <AdminStack.Screen name={AppScreens.ADMIN_DASHBOARD} component={AdminDashboardScreen} />
      <AdminStack.Screen name={AppScreens.ADMIN_USERS} component={AdminUsersScreen} />
      <AdminStack.Screen name={AppScreens.ADMIN_QUOTA} component={AdminQuotaScreen} />
    </AdminStack.Navigator>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────

const BottomTab = createBottomTabNavigator();
function TabNavigator() {
  const isAdmin = useIsAdmin();

  return (
    <BottomTab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
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

// ─── Root Stack (shared screens reachable from any tab) ───────────────────────

const RootStack = createNativeStackNavigator();
function PhoneNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "slide_from_right",
      }}
    >
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      {/* Shared screens — reachable from Photos, Recent, Favorites, Home, Search, Trash */}
      <RootStack.Screen name={AppScreens.FILE_DETAIL} component={FileDetailScreen} />
      <RootStack.Screen name={AppScreens.FOLDER} component={FolderScreen} />
    </RootStack.Navigator>
  );
}

// ─── Tablet Drawer Navigator ──────────────────────────────────────────────────

const Drawer = createDrawerNavigator();
function TabletNavigator() {
  const isAdmin = useIsAdmin();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: "transparent" },
      }}
    >
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

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { isTablet } = useResponsive();
  return (
    <View className="flex-1 bg-background">
      <AuroraBackground />
      {isTablet ? <TabletNavigator /> : <PhoneNavigator />}
    </View>
  );
}

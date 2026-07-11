import React from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  House,
  Folder,
  Image,
  Clock,
  Star,
  Trash2,
  Settings,
  LayoutDashboard,
  Users,
  Gauge,
} from "lucide-react-native";

// Constants
import { AppScreens } from "@constants/appScreens";

// Hooks
import { useResponsive } from "@hooks/useResponsive";
import { useIsAdmin } from "@hooks/useIsAdmin";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import AuroraBackground from "@components/auth/AuroraBackground";
import GlassTabBar from "@components/navigation/GlassTabBar";
import GlassDrawerContent from "@components/navigation/GlassDrawerContent";

// Screens
import HomeScreen from "@screens/home/HomeScreen";
import MyFilesScreen from "@screens/files/MyFilesScreen";
import FolderScreen from "@screens/files/FolderScreen";
import FileDetailScreen from "@screens/files/FileDetailScreen";
import PhotosScreen from "@screens/photos/PhotosScreen";
import RecentScreen from "@screens/recent/RecentScreen";
import FavoritesScreen from "@screens/favorites/FavoritesScreen";
import TrashScreen from "@screens/trash/TrashScreen";
import SearchScreen from "@screens/search/SearchScreen";
import SettingsScreen from "@screens/settings/SettingsScreen";
import NotificationsScreen from "@screens/notifications/NotificationsScreen";
import AdminDashboardScreen from "@screens/admin/AdminDashboardScreen";
import AdminUsersScreen from "@screens/admin/AdminUsersScreen";
import AdminQuotaScreen from "@screens/admin/AdminQuotaScreen";

// ─── Drawer/tab nav-item definitions ───────────────────────────────────────────

function useNavItemSets() {
  const { colors } = useTheme();
  return {
    normalTablet: [
      { screen: AppScreens.HOME, icon: House, label: "Home", accentColor: colors.primary.DEFAULT },
      { screen: AppScreens.FILES, icon: Folder, label: "Files", accentColor: colors.primary.DEFAULT },
      { screen: AppScreens.PHOTOS, icon: Image, label: "Photos", accentColor: colors.alt.DEFAULT },
      { screen: AppScreens.RECENT, icon: Clock, label: "Recent", accentColor: colors.warning.DEFAULT },
      { screen: AppScreens.FAVORITES, icon: Star, label: "Favorites", accentColor: colors.warning.DEFAULT },
      { screen: AppScreens.TRASH, icon: Trash2, label: "Trash", accentColor: colors.danger.DEFAULT },
      { screen: AppScreens.SETTINGS, icon: Settings, label: "Settings", accentColor: colors.neutral.DEFAULT },
    ],
    normalPhoneDrawer: [
      { screen: AppScreens.HOME, icon: House, label: "Home", accentColor: colors.primary.DEFAULT },
      { screen: AppScreens.RECENT, icon: Clock, label: "Recent", accentColor: colors.warning.DEFAULT },
      { screen: AppScreens.FAVORITES, icon: Star, label: "Favorites", accentColor: colors.warning.DEFAULT },
      { screen: AppScreens.TRASH, icon: Trash2, label: "Trash", accentColor: colors.danger.DEFAULT },
      { screen: AppScreens.SETTINGS, icon: Settings, label: "Settings", accentColor: colors.neutral.DEFAULT },
    ],
    admin: [
      {
        screen: AppScreens.ADMIN_DASHBOARD,
        icon: LayoutDashboard,
        label: "Dashboard",
        accentColor: colors.primary.DEFAULT,
      },
      { screen: AppScreens.ADMIN_USERS, icon: Users, label: "Users", accentColor: colors.primary.DEFAULT },
      { screen: AppScreens.ADMIN_QUOTA, icon: Gauge, label: "Quota Request", accentColor: colors.primary.DEFAULT },
      { screen: AppScreens.SETTINGS, icon: Settings, label: "Settings", accentColor: colors.neutral.DEFAULT },
    ],
  };
}

// ─── Stack Navigators ─────────────────────────────────────────────────────────

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

// ─── Normal-user Tab Navigator (phone) ─────────────────────────────────────────

const BottomTab = createBottomTabNavigator();
function NormalTabNavigator() {
  const { colors } = useTheme();

  return (
    <BottomTab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <BottomTab.Screen
        name={AppScreens.HOME}
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
          tabBarActiveTintColor: colors.primary.DEFAULT,
        }}
      />
      <BottomTab.Screen
        name={AppScreens.FILES}
        component={FilesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Folder color={color} size={size} />,
          tabBarActiveTintColor: colors.primary.DEFAULT,
        }}
      />
      <BottomTab.Screen
        name={AppScreens.PHOTOS}
        component={PhotosScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Image color={color} size={size} />,
          tabBarActiveTintColor: colors.alt.DEFAULT,
        }}
      />
    </BottomTab.Navigator>
  );
}

// ─── Admin Tab Navigator (phone) ───────────────────────────────────────────────

function AdminTabNavigator() {
  const { colors } = useTheme();

  return (
    <BottomTab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <BottomTab.Screen
        name={AppScreens.ADMIN_DASHBOARD}
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          tabBarActiveTintColor: colors.primary.DEFAULT,
        }}
      />
      <BottomTab.Screen
        name={AppScreens.ADMIN_USERS}
        component={AdminUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          tabBarActiveTintColor: colors.primary.DEFAULT,
        }}
      />
      <BottomTab.Screen
        name={AppScreens.ADMIN_QUOTA}
        component={AdminQuotaScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Gauge color={color} size={size} />,
          tabBarActiveTintColor: colors.primary.DEFAULT,
        }}
      />
      <BottomTab.Screen
        name={AppScreens.SETTINGS}
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          tabBarActiveTintColor: colors.neutral.DEFAULT,
        }}
      />
    </BottomTab.Navigator>
  );
}

// ─── Normal-user Root Stack + Drawer (phone) ───────────────────────────────────

const NormalRootStack = createNativeStackNavigator();
function NormalPhoneRootStack() {
  return (
    <NormalRootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "slide_from_right",
      }}
    >
      <NormalRootStack.Screen name="Tabs" component={NormalTabNavigator} />
      <NormalRootStack.Screen name={AppScreens.FILE_DETAIL} component={FileDetailScreen} />
      <NormalRootStack.Screen name={AppScreens.FOLDER} component={FolderScreen} />
      <NormalRootStack.Screen name={AppScreens.SEARCH} component={SearchScreen} />
      <NormalRootStack.Screen name={AppScreens.SETTINGS} component={SettingsScreen} />
      <NormalRootStack.Screen name={AppScreens.NOTIFICATIONS} component={NotificationsScreen} />
      <NormalRootStack.Screen name={AppScreens.RECENT} component={RecentScreen} />
      <NormalRootStack.Screen name={AppScreens.FAVORITES} component={FavoritesScreen} />
      <NormalRootStack.Screen name={AppScreens.TRASH} component={TrashScreen} />
    </NormalRootStack.Navigator>
  );
}

const PhoneDrawer = createDrawerNavigator();
function NormalPhoneNavigator() {
  const { normalPhoneDrawer } = useNavItemSets();

  return (
    <PhoneDrawer.Navigator
      drawerContent={(props) => <GlassDrawerContent {...props} items={normalPhoneDrawer} nested />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        drawerStyle: { backgroundColor: "transparent" },
      }}
    >
      <PhoneDrawer.Screen name="Root" component={NormalPhoneRootStack} />
    </PhoneDrawer.Navigator>
  );
}

// ─── Admin Root Stack (phone, no drawer) ───────────────────────────────────────

const AdminRootStack = createNativeStackNavigator();
function AdminPhoneNavigator() {
  return (
    <AdminRootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "slide_from_right",
      }}
    >
      <AdminRootStack.Screen name="Tabs" component={AdminTabNavigator} />
      <AdminRootStack.Screen name={AppScreens.NOTIFICATIONS} component={NotificationsScreen} />
    </AdminRootStack.Navigator>
  );
}

// ─── Phone Root ─────────────────────────────────────────────────────────────────

function PhoneNavigator() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <AdminPhoneNavigator /> : <NormalPhoneNavigator />;
}

// ─── Tablet Drawer Navigator ──────────────────────────────────────────────────

const Drawer = createDrawerNavigator();
function TabletNavigator() {
  const isAdmin = useIsAdmin();

  const { normalTablet, admin } = useNavItemSets();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <GlassDrawerContent {...props} items={isAdmin ? admin : normalTablet} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        drawerStyle: { backgroundColor: "transparent" },
      }}
    >
      {isAdmin ? (
        <>
          <Drawer.Screen name={AppScreens.ADMIN_DASHBOARD} component={AdminDashboardScreen} />
          <Drawer.Screen name={AppScreens.ADMIN_USERS} component={AdminUsersScreen} />
          <Drawer.Screen name={AppScreens.ADMIN_QUOTA} component={AdminQuotaScreen} />
          <Drawer.Screen name={AppScreens.SETTINGS} component={SettingsScreen} />
          <Drawer.Screen name={AppScreens.NOTIFICATIONS} component={NotificationsScreen} />
        </>
      ) : (
        <>
          <Drawer.Screen name={AppScreens.HOME} component={HomeScreen} />
          <Drawer.Screen name={AppScreens.FILES} component={FilesStackNavigator} />
          <Drawer.Screen name={AppScreens.PHOTOS} component={PhotosScreen} />
          <Drawer.Screen name={AppScreens.RECENT} component={RecentScreen} />
          <Drawer.Screen name={AppScreens.FAVORITES} component={FavoritesScreen} />
          <Drawer.Screen name={AppScreens.TRASH} component={TrashScreen} />
          <Drawer.Screen name={AppScreens.SETTINGS} component={SettingsScreen} />
          <Drawer.Screen name={AppScreens.SEARCH} component={SearchScreen} />
          <Drawer.Screen name={AppScreens.NOTIFICATIONS} component={NotificationsScreen} />
        </>
      )}
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

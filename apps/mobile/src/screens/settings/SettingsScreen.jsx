import React, { useState, useEffect } from "react";
import { View, Pressable, Switch, ScrollView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Sun, Moon, Monitor, Trash2, LogOut } from "lucide-react-native";

// Actions
import { setColorMode } from "@redux-slices/themeSlice";
import { ErrorActions } from "@redux-slices/errorSlice";

// Rtk
import { useGetMeQuery, useLogoutMutation } from "@api/authApi";
import { useGetQuotaUsageQuery } from "@api/quotaApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Hooks
import { useBiometric } from "@hooks/useBiometric";
import { useOfflineFiles } from "@hooks/useOfflineFiles";
import { usePhotoBackup } from "@hooks/usePhotoBackup";

// Db
import itemsRepository from "@db/repositories/itemsRepository";
import transfersRepository from "@db/repositories/transfersRepository";
import photoBackupsRepository from "@db/repositories/photoBackupsRepository";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";

function QuotaBar({ usedBytes = 0, totalBytes = 1 }) {
  const pct = totalBytes > 0 ? Math.min(usedBytes / totalBytes, 1) : 0;
  return (
    <GlassCard>
      <View className="flex-row justify-between mb-2">
        <Text size="sm" bold>
          Storage
        </Text>
        <Text size="sm" className="text-secondary">
          {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-neutral-subtle">
        <View className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(pct * 100)}%` }} />
      </View>
    </GlassCard>
  );
}

const COLOR_MODES = [
  { label: "Light", value: "light", Icon: Sun },
  { label: "Dark", value: "dark", Icon: Moon },
  { label: "System", value: "system", Icon: Monitor },
];

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const colorMode = useSelector((s) => s.theme.colorMode);

  // Auth
  const { data: me } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const { data: quota } = useGetQuotaUsageQuery();

  // Biometric
  const { isAvailable, isEnabled, authenticate, setEnabled } = useBiometric();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [biometricError, setBiometricError] = useState("");

  // Offline storage
  const { getMarkedFiles, removeOffline } = useOfflineFiles();
  const [dbSizeBytes, setDbSizeBytes] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [clearingOffline, setClearingOffline] = useState(false);

  // Auto-backup
  const {
    enabled: backupEnabled,
    wifiOnly,
    chargingOnly,
    lastBackupTimestamp,
    toggle: toggleBackup,
    setWifiOnly,
    setChargingOnly,
    getPendingCount,
  } = usePhotoBackup();
  const [pendingBackupCount, setPendingBackupCount] = useState(0);

  async function loadStorageStats() {
    const files = await getMarkedFiles();
    setOfflineCount(files.length);
    setDbSizeBytes(itemsRepository.getDbSizeBytes());
    setPendingBackupCount(await getPendingCount());
  }

  useEffect(() => {
    loadStorageStats();
    Promise.all([isAvailable(), isEnabled()]).then(([available, enabled]) => {
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setBiometricLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBiometricToggle(value) {
    setBiometricError("");
    if (value) {
      const result = await authenticate();
      if (result.success) {
        setEnabled(true);
        setBiometricEnabled(true);
      } else {
        setBiometricError(result.warning ?? "Biometric authentication failed");
      }
    } else {
      setEnabled(false);
      setBiometricEnabled(false);
    }
  }

  async function handleClearOffline() {
    setClearingOffline(true);
    try {
      const files = await getMarkedFiles();
      for (const f of files) {
        await removeOffline(f.id);
      }
      await transfersRepository.clearCompleted();
      await photoBackupsRepository.clearAll();
      await loadStorageStats();
    } catch {
      dispatch(ErrorActions.setError({ errorInfo: { message: "Failed to clear offline files" } }));
    } finally {
      setClearingOffline(false);
    }
  }

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      dispatch(ErrorActions.setError({ errorInfo: { message: "Logout failed — please try again" } }));
    }
  }

  const biometricRowDisabled = biometricLoading || !biometricAvailable;
  const lastBackupLabel = lastBackupTimestamp ? new Date(lastBackupTimestamp).toLocaleString() : "Never";

  return (
    <ScreenLayout>
      <GlassHeader title="Settings" />

      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-8">
        {quota ? <QuotaBar usedBytes={quota.used_bytes ?? 0} totalBytes={quota.quota_bytes ?? 1} /> : null}

        {/* Profile */}
        {me ? (
          <GlassCard>
            <Text bold className="mb-1">
              {me.name ?? me.email}
            </Text>
            <Text size="sm" className="text-secondary">
              {me.email}
            </Text>
          </GlassCard>
        ) : null}

        {/* Appearance */}
        <GlassCard>
          <Text bold className="mb-3">
            Appearance
          </Text>
          <View className="flex-row gap-2">
            {COLOR_MODES.map(({ label, value, Icon }) => {
              const active = colorMode === value;
              const iconColor = active ? colors.primary.DEFAULT : colors.neutral.DEFAULT;
              return (
                <Pressable
                  key={value}
                  onPress={() => dispatch(setColorMode(value))}
                  style={{
                    borderColor: active ? colors.primary.DEFAULT : colors.surface.border,
                    backgroundColor: active ? colors.primary.subtle : colors.surface.card,
                  }}
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full border"
                >
                  <Icon size={13} color={iconColor} strokeWidth={active ? 2.5 : 1.8} />
                  <Text size="sm" style={{ color: iconColor, fontWeight: active ? "600" : "400" }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* Security */}
        <GlassCard style={{ opacity: biometricRowDisabled ? 0.4 : 1 }}>
          <Text bold className="mb-3">
            Security
          </Text>
          <View className="flex-row items-center justify-between">
            <Text size="sm">Biometric Lock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={biometricRowDisabled}
              trackColor={{ false: colors.neutral.light, true: colors.primary.DEFAULT }}
              thumbColor={colors.primary.foreground}
            />
          </View>
          {!biometricAvailable && !biometricLoading ? (
            <Text size="xs" className="text-secondary mt-1">
              No biometrics enrolled on this device
            </Text>
          ) : null}
          {biometricError.length > 0 ? (
            <Text size="xs" className="text-danger mt-1">
              {biometricError}
            </Text>
          ) : null}
        </GlassCard>

        {/* Auto-backup */}
        <GlassCard>
          <Text bold className="mb-3">
            Auto-Backup
          </Text>
          <View className="flex-row items-center justify-between mb-3">
            <Text size="sm">Enable photo backup</Text>
            <Switch
              value={backupEnabled}
              onValueChange={toggleBackup}
              trackColor={{ false: colors.neutral.light, true: colors.primary.DEFAULT }}
              thumbColor={colors.primary.foreground}
            />
          </View>
          {backupEnabled ? (
            <>
              <View className="flex-row items-center justify-between mb-2">
                <Text size="sm" className="text-secondary">
                  Wi-Fi only
                </Text>
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: colors.neutral.light, true: colors.primary.DEFAULT }}
                  thumbColor={colors.primary.foreground}
                />
              </View>
              <View className="flex-row items-center justify-between mb-3">
                <Text size="sm" className="text-secondary">
                  Charging only
                </Text>
                <Switch
                  value={chargingOnly}
                  onValueChange={setChargingOnly}
                  trackColor={{ false: colors.neutral.light, true: colors.primary.DEFAULT }}
                  thumbColor={colors.primary.foreground}
                />
              </View>
              <View className="flex-row justify-between">
                <Text size="xs" className="text-secondary">
                  Last backed up
                </Text>
                <Text size="xs">{lastBackupLabel}</Text>
              </View>
              {pendingBackupCount > 0 ? (
                <Text size="xs" className="text-warning mt-1">
                  {pendingBackupCount} photo{pendingBackupCount > 1 ? "s" : ""} pending upload
                </Text>
              ) : null}
            </>
          ) : null}
        </GlassCard>

        {/* Storage */}
        <GlassCard>
          <Text bold className="mb-3">
            Storage
          </Text>
          <View className="flex-row justify-between items-center mb-2">
            <Text size="sm" className="text-secondary">
              Cached offline files
            </Text>
            <Text size="sm" className="font-medium">
              {offlineCount}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mb-3">
            <Text size="sm" className="text-secondary">
              Database size
            </Text>
            <Text size="sm" className="font-medium">
              {(dbSizeBytes / 1024).toFixed(1)} KB
            </Text>
          </View>
          <Pressable
            onPress={handleClearOffline}
            disabled={clearingOffline || offlineCount === 0}
            style={{ opacity: clearingOffline || offlineCount === 0 ? 0.4 : 1 }}
            className="flex-row items-center gap-2"
          >
            <Trash2 size={14} color={colors.danger.DEFAULT} />
            <Text size="sm" style={{ color: colors.danger.DEFAULT }}>
              {clearingOffline ? "Clearing…" : "Clear cache"}
            </Text>
          </Pressable>
        </GlassCard>

        {/* Logout */}
        <Button variant="destructive" size="lg" onPress={handleLogout} disabled={loggingOut}>
          <LogOut size={18} />
          <ButtonText>{loggingOut ? "Logging out…" : "Log Out"}</ButtonText>
        </Button>
      </ScrollView>
    </ScreenLayout>
  );
}

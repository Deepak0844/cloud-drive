import { Alert } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { useDispatch, useSelector } from "react-redux";

import { setBackupEnabled, setWifiOnly, setChargingOnly } from "@redux-slices/photoBackupSlice";
import photoBackupsRepository from "@db/repositories/photoBackupsRepository";

export function usePhotoBackup() {
  const dispatch = useDispatch();
  const { enabled, wifiOnly, chargingOnly, lastBackupTimestamp } = useSelector((state) => state.photoBackup);

  async function toggle(val) {
    if (val) {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Go to Settings → Privacy → Photos and grant full access.");
        return;
      }
    }
    dispatch(setBackupEnabled(val));
  }

  async function getPendingCount() {
    const rows = await photoBackupsRepository.getPendingAssets();
    return rows.length;
  }

  return {
    enabled,
    wifiOnly,
    chargingOnly,
    lastBackupTimestamp,
    toggle,
    getPendingCount,
    setWifiOnly: (val) => dispatch(setWifiOnly(val)),
    setChargingOnly: (val) => dispatch(setChargingOnly(val)),
  };
}

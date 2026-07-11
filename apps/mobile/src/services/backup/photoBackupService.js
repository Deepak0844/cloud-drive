import * as MediaLibrary from "expo-media-library/legacy";
import NetInfo from "@react-native-community/netinfo";
import Battery, { BatteryState } from "expo-battery";

// Store
import Store from "@store";

// Db
import photoBackupsRepository from "@db/repositories/photoBackupsRepository";
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import uploadQueue from "@lib/uploadQueue";

let subscription = null;

async function canUpload() {
  const { wifiOnly, chargingOnly } = Store.getState().photoBackup;
  if (wifiOnly) {
    const net = await NetInfo.fetch();
    if (net.type !== "wifi") return false;
  }
  if (chargingOnly && Battery) {
    const state = await Battery.getBatteryStateAsync();
    const charging = state === BatteryState.CHARGING;
    if (!charging) return false;
  }
  return true;
}

async function processAsset(asset) {
  if (await photoBackupsRepository.isAlreadyBacked(asset.id)) return;
  await photoBackupsRepository.upsertAsset({
    assetId: asset.id,
    fileName: asset.filename,
    size: asset.fileSize ?? null,
    mimeType: asset.mediaType === "photo" ? "image/jpeg" : "video/mp4",
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await transfersRepository.upsertTransfer({
    id: asset.id,
    fileId: asset.id,
    type: "upload",
    status: "pending",
    name: asset.filename,
    dest: asset.uri,
    mimeType: asset.mediaType === "photo" ? "image/jpeg" : "video/mp4",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function initialSync() {
  const { lastBackupTimestamp } = Store.getState().photoBackup;
  const { assets } = await MediaLibrary.getAssetsAsync({
    mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
    after: lastBackupTimestamp ? String(lastBackupTimestamp) : undefined,
    sortBy: MediaLibrary.SortBy.creationTime,
  });
  for (const asset of assets) {
    await processAsset(asset);
  }
  if (await canUpload()) {
    await uploadQueue.drainQueue();
  }
}

function startListening() {
  subscription = MediaLibrary.addListener(async ({ insertedAssets }) => {
    for (const asset of insertedAssets ?? []) {
      await processAsset(asset);
    }
    if (await canUpload()) {
      await uploadQueue.drainQueue();
    }
  });
}

function stopListening() {
  subscription?.remove();
  subscription = null;
}

const photoBackupService = { initialSync, startListening, stopListening };

export default photoBackupService;

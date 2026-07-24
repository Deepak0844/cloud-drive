import { requireNativeModule } from "expo-modules-core";

// Config
import { USE_NATIVE_TRANSFER } from "./featureFlag";

const isNativeAvailable = USE_NATIVE_TRANSFER;

const nativeModule = requireNativeModule("BackgroundChunkTransfer");

/** Thrown when startDownload is rejected because a different transfer is already active. */
export class BusyError extends Error {
  constructor(transferId) {
    super(`Transfer engine busy — cannot start ${transferId}, another transfer is active`);
    this.name = "BusyError";
    this.transferId = transferId;
  }
}

function startUpload(options) {
  return nativeModule.startUpload(options);
}

function startDownload(options) {
  return nativeModule.startDownload(options);
}

function pause(transferId) {
  nativeModule.pause(transferId);
}

function cancel(transferId) {
  nativeModule.cancel(transferId);
}

/** @returns {Promise<string|null>} the transferId currently running natively, if any. */
function getActiveTransferId() {
  return nativeModule.getActiveTransferId();
}

/**
 * status "busy" (transferId only, no progress/cloudFileId/localUri) means a second concurrent
 * start was rejected — see backgroundTransfer.js's _uploadViaNative/_downloadViaNative.
 * @param {(event: {transferId: string, type: string, status: string, progress: number|null, cloudFileId: string|null, localUri: string|null}) => void} callback
 * @returns {() => void} unsubscribe
 */
function addTransferListener(callback) {
  const subscription = nativeModule.addListener("onTransferEvent", callback);
  return () => subscription.remove();
}

const nativeTransfer = {
  isNativeAvailable,
  startUpload,
  startDownload,
  pause,
  cancel,
  getActiveTransferId,
  addTransferListener,
};

export default nativeTransfer;

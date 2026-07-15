import { requireNativeModule } from "expo-modules-core";

const isNativeAvailable = true;

const nativeModule = requireNativeModule("BackgroundChunkTransfer");

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

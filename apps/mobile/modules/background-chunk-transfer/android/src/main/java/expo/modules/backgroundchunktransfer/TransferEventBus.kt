package expo.modules.backgroundchunktransfer

/**
 * In-process pub/sub between BackgroundChunkTransferService (which has the actual progress data)
 * and BackgroundChunkTransferModule (which is what can call sendEvent to reach JS) — they're
 * separate classes with no direct reference to each other, but always run in the same process.
 */
object TransferEventBus {
  var listener: ((Map<String, Any?>) -> Unit)? = null

  // Mirrors the Service's currentTransferId — lets the Module answer "is this transfer already
  // running?" synchronously (e.g. for syncService.js's reconciliation pass on app foreground),
  // without re-invoking startUpload and risking a second concurrent coroutine for the same work.
  var activeTransferId: String? = null

  fun emit(event: Map<String, Any?>) {
    listener?.invoke(event)
  }
}

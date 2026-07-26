package expo.modules.backgroundchunktransfer

/**
 * In-process pub/sub between BackgroundChunkTransferService (has the progress data) and
 * BackgroundChunkTransferModule (can call sendEvent to reach JS) — separate classes with no direct
 * reference to each other, but always run in the same process.
 */
object TransferEventBus {
  var listener: ((Map<String, Any?>) -> Unit)? = null

  // Mirrors the Service's currentTransferId — lets the Module answer "is this running?"
  // synchronously (e.g. syncService.js's foreground reconciliation) without risking a second
  // concurrent coroutine for the same work.
  var activeTransferId: String? = null

  fun emit(event: Map<String, Any?>) {
    listener?.invoke(event)
  }
}

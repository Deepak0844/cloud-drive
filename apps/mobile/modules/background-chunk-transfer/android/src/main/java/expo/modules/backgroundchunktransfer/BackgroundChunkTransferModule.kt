package expo.modules.backgroundchunktransfer

import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BackgroundChunkTransferModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackgroundChunkTransfer")

    Events("onTransferEvent")

    OnCreate {
      TransferEventBus.listener = { event -> sendEvent("onTransferEvent", event) }
    }

    OnDestroy {
      TransferEventBus.listener = null
    }

    Function("ping") {
      "pong"
    }

    Function("getActiveTransferId") {
      TransferEventBus.activeTransferId
    }

    Function("startUpload") { options: StartUploadOptions ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val activeId = TransferEventBus.activeTransferId

      // Primary busy guard: must run BEFORE startForegroundService, not inside onStartCommand — a
      // service started that way must call startForeground() in time or it throws
      // ForegroundServiceDidNotStartInTimeException. Refusing here means that call never happens.
      if (activeId != null && activeId != options.transferId) {
        emitBusy(options.transferId, "upload")
      } else {
        val intent = Intent(context, BackgroundChunkTransferService::class.java).apply {
          putExtra("transferId", options.transferId)
          putExtra("localUri", options.localUri)
          putExtra("fileName", options.fileName)
          putExtra("mimeType", options.mimeType)
          putExtra("folderId", options.folderId)
          putExtra("baseUrl", options.baseUrl)
          putExtra("uploadId", options.uploadId)
          putExtra("totalChunks", options.totalChunks)
          putExtra("startChunk", options.startChunk)
          putExtra("retryCount", options.retryCount)
        }
        ContextCompat.startForegroundService(context, intent)
      }
      null
    }

    Function("startDownload") { options: StartDownloadOptions ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val activeId = TransferEventBus.activeTransferId

      if (activeId != null && activeId != options.transferId) {
        emitBusy(options.transferId, "download")
      } else {
        val intent = Intent(context, BackgroundChunkTransferService::class.java).apply {
          action = BackgroundChunkTransferService.ACTION_START_DOWNLOAD
          putExtra("transferId", options.transferId)
          putExtra("fileId", options.fileId)
          putExtra("url", options.url)
          putExtra("destPath", options.destPath)
          putExtra("fileName", options.fileName)
          putExtra("baseUrl", options.baseUrl)
        }
        ContextCompat.startForegroundService(context, intent)
      }
      null
    }

    Function("pause") { transferId: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(context, BackgroundChunkTransferService::class.java).apply {
        action = BackgroundChunkTransferService.ACTION_PAUSE
        putExtra("transferId", transferId)
      }
      // Plain startService: this only signals an already-running foreground service (or, if none is
      // running, a quick SQLite-only status update) — never required to call startForeground() itself.
      context.startService(intent)
      null
    }

    Function("cancel") { transferId: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(context, BackgroundChunkTransferService::class.java).apply {
        action = BackgroundChunkTransferService.ACTION_CANCEL
        putExtra("transferId", transferId)
      }
      context.startService(intent)
      null
    }
  }

  private fun emitBusy(transferId: String, type: String) {
    TransferEventBus.emit(
      mapOf(
        "transferId" to transferId,
        "type" to type,
        "status" to "busy",
        "progress" to null,
        "cloudFileId" to null,
        "localUri" to null
      )
    )
  }
}

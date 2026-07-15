import ExpoModulesCore

public class BackgroundChunkTransferModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundChunkTransfer")

    Events("onTransferEvent")

    OnCreate {
      TransferEventBus.listener = { [weak self] event in self?.sendEvent("onTransferEvent", event) }
    }

    OnDestroy {
      TransferEventBus.listener = nil
    }

    Function("ping") { () -> String in
      "pong"
    }

    Function("getActiveTransferId") { () -> String? in
      TransferEventBus.activeTransferId
    }

    Function("startUpload") { (options: StartUploadOptions) in
      BackgroundChunkTransferManager.shared.startUpload(UploadParams(options: options))
    }

    Function("startDownload") { (options: StartDownloadOptions) in
      BackgroundChunkTransferManager.shared.startDownload(DownloadParams(options: options))
    }

    Function("pause") { (transferId: String) in
      BackgroundChunkTransferManager.shared.pause(transferId: transferId)
    }

    Function("cancel") { (transferId: String) in
      BackgroundChunkTransferManager.shared.cancel(transferId: transferId)
    }
  }
}

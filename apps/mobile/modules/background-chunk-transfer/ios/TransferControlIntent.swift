import AppIntents

/// Live Activity button intent (iOS 17+). A `LiveActivityIntent`'s `perform()` runs in the APP's
/// process — iOS launches the app in the background to run it — so this app-target copy calls the
/// transfer engine directly. The widget target compiles a STUB copy (targets/transfer-activity/)
/// whose only job is to provide the type for `Button(intent:)`; the system always executes THIS
/// implementation. The type name, `@Parameter` set, and `init`s MUST match the widget stub.
@available(iOS 17.0, *)
struct TransferControlIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Transfer control"

  @Parameter(title: "Transfer ID") var transferId: String
  @Parameter(title: "Action") var action: String

  init() {}

  init(transferId: String, action: String) {
    self.transferId = transferId
    self.action = action
  }

  func perform() async throws -> some IntentResult {
    switch action {
    case "pause": BackgroundChunkTransferManager.shared.pause(transferId: transferId)
    case "resume": BackgroundChunkTransferManager.shared.resume(transferId: transferId)
    case "stop": BackgroundChunkTransferManager.shared.cancel(transferId: transferId)
    default: break
    }
    return .result()
  }
}

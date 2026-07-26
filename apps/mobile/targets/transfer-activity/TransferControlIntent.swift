import AppIntents

/// Widget-target STUB of TransferControlIntent. A `LiveActivityIntent` runs `perform()` in the APP's
/// process, so the widget only needs this type to attach to `Button(intent:)`; the system executes
/// the app target's copy. `perform()` is left empty so the widget never references app-only code.
/// Type name, `@Parameter` set, and `init`s MUST match the app-target copy.
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
    return .result()
  }
}

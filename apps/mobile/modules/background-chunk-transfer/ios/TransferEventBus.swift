import Foundation

/// In-process pub/sub between BackgroundChunkTransferManager (which has the actual progress
/// data) and BackgroundChunkTransferModule (which is what can call sendEvent to reach JS) —
/// mirrors the Android TransferEventBus/BackgroundChunkTransferService split.
enum TransferEventBus {
  static var listener: (([String: Any?]) -> Void)?
  static var activeTransferId: String?

  static func emit(_ event: [String: Any?]) {
    listener?(event)
  }
}

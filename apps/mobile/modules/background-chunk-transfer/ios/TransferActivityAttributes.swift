import ActivityKit
import Foundation

// ⚠️ SHARED-STRUCT TWIN — this file is duplicated byte-for-byte in two targets:
//   1. apps/mobile/modules/background-chunk-transfer/ios/TransferActivityAttributes.swift  (app target)
//   2. apps/mobile/targets/transfer-activity/TransferActivityAttributes.swift              (widget target)
// ActivityKit matches attributes across the app and widget processes structurally, so both must
// compile an identical definition or the widget silently fails to decode updates. @bacons/apple-targets
// doesn't share source, so it's duplicated — any edit here MUST be mirrored in the twin, same commit.
struct TransferActivityAttributes: ActivityAttributes {
  // The values that change over the life of one transfer.
  public struct ContentState: Codable, Hashable {
    // 0...100 whole-percent progress (the engine throttles to whole-percent changes).
    var progress: Double
    // "active" | "paused" | "uploaded" | "downloaded" | "failed" | "cancelled" — drives label and icon.
    var state: String
  }

  // Fixed for the life of the Activity.
  // The transfer's id, so the Pause/Resume/Stop buttons (TransferControlIntent) can address it.
  var transferId: String
  var fileName: String
  // "upload" | "download".
  var transferType: String
}

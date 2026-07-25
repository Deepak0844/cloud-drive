import ActivityKit
import Foundation

// ⚠️ SHARED-STRUCT TWIN — this file is duplicated byte-for-byte in two targets:
//   1. apps/mobile/modules/background-chunk-transfer/ios/TransferActivityAttributes.swift  (app target)
//   2. apps/mobile/targets/transfer-activity/TransferActivityAttributes.swift              (widget target)
// ActivityKit matches attributes across the app and widget-extension processes structurally (by the
// encoded shape of the struct), so BOTH processes must compile an identical definition — otherwise
// the widget silently fails to decode Activity updates. @bacons/apple-targets does not share source
// between targets, so the struct is duplicated rather than referenced. Any edit here MUST be mirrored
// in the twin, in the same commit. The header is intentionally identical in both copies so the files
// stay literally byte-identical.
struct TransferActivityAttributes: ActivityAttributes {
  // The values that change over the life of one transfer.
  public struct ContentState: Codable, Hashable {
    // 0...100 whole-percent progress (the engine throttles updates to whole-percent changes).
    var progress: Double
    // "active" | "paused" | "uploaded" | "downloaded" | "failed" | "cancelled" — drives the label
    // and icon in the Lock Screen card and Dynamic Island.
    var state: String
  }

  // Fixed for the life of the Activity.
  // The transfer's id, so the Live Activity's Pause/Resume/Stop buttons (TransferControlIntent) can
  // address it.
  var transferId: String
  var fileName: String
  // "upload" | "download".
  var transferType: String
}

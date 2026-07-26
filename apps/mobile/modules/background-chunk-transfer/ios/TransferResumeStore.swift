import Foundation

/// Durable per-transfer record of an upload's static parameters, so the chunk chain can continue
/// natively after iOS terminates and relaunches the app for its background-URLSession events (when
/// the in-memory `currentParams` is gone). Only unchanging fields are stored; progress is recovered
/// from the completed task's `taskDescription`, so the record never needs rewriting mid-transfer.
/// Serialized via UploadParams.asUserInfo / init?(userInfo:) — the same shape the notification-Resume
/// path uses. Lives under Application Support (survives relaunch, not OS-purgeable); written at
/// startUpload, removed on a terminal state.
enum TransferResumeStore {
  private static var directory: URL {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let dir = base.appendingPathComponent("transfer-resume", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private static func fileUrl(_ transferId: String) -> URL {
    directory.appendingPathComponent("resume-\(transferId).plist")
  }

  static func write(_ params: UploadParams) {
    guard let data = try? PropertyListSerialization.data(
      fromPropertyList: params.asUserInfo, format: .binary, options: 0
    ) else {
      NSLog("[TransferResumeStore] #write :: could not serialize resume record - \(params.transferId)")
      return
    }
    try? data.write(to: fileUrl(params.transferId), options: .atomic)
  }

  static func read(transferId: String) -> UploadParams? {
    guard let data = try? Data(contentsOf: fileUrl(transferId)),
          let dict = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
          let info = dict as? [AnyHashable: Any] else {
      return nil
    }
    return UploadParams(userInfo: info)
  }

  static func remove(transferId: String) {
    try? FileManager.default.removeItem(at: fileUrl(transferId))
  }
}

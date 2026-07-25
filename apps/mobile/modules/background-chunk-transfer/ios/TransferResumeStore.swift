import Foundation

/// Durable per-transfer record of an upload's static parameters, so the chunk chain can be
/// continued natively after the app is terminated in the background and relaunched by iOS for its
/// background-URLSession events — at which point the in-memory `currentParams` is gone.
///
/// Only the fields that don't change over the transfer are stored (baseUrl, uploadId, totalChunks,
/// fileName, mimeType, folderId, localUri); the *progress* — which chunk just finished — is recovered
/// from the completed task's `taskDescription`, not from here, so the record never needs rewriting
/// mid-transfer. Serialized via UploadParams.asUserInfo / init?(userInfo:), the same shape already
/// used for the notification-Resume path, so there is one encoding to keep correct.
///
/// Lives under Application Support (created on demand), which survives relaunch and is not the
/// OS-purgeable Caches dir. Written at startUpload, removed on the transfer's terminal state.
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

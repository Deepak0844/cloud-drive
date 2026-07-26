import Foundation

struct UploadParams {
  let transferId: String
  let localUri: String
  let fileName: String
  let mimeType: String
  let folderId: String?
  let baseUrl: String
  let uploadId: String
  let totalChunks: Int
  var startChunk: Int
  let retryCount: Int

  init(
    transferId: String,
    localUri: String,
    fileName: String,
    mimeType: String,
    folderId: String?,
    baseUrl: String,
    uploadId: String,
    totalChunks: Int,
    startChunk: Int,
    retryCount: Int
  ) {
    self.transferId = transferId
    self.localUri = localUri
    self.fileName = fileName
    self.mimeType = mimeType
    self.folderId = folderId
    self.baseUrl = baseUrl
    self.uploadId = uploadId
    self.totalChunks = totalChunks
    self.startChunk = startChunk
    self.retryCount = retryCount
  }

  func with(startChunk: Int) -> UploadParams {
    UploadParams(
      transferId: transferId,
      localUri: localUri,
      fileName: fileName,
      mimeType: mimeType,
      folderId: folderId,
      baseUrl: baseUrl,
      uploadId: uploadId,
      totalChunks: totalChunks,
      startChunk: startChunk,
      retryCount: retryCount
    )
  }

  init(options: StartUploadOptions) {
    self.transferId = options.transferId
    self.localUri = options.localUri
    self.fileName = options.fileName
    self.mimeType = options.mimeType
    self.folderId = options.folderId
    self.baseUrl = options.baseUrl
    self.uploadId = options.uploadId
    self.totalChunks = options.totalChunks
    self.startChunk = options.startChunk
    self.retryCount = options.retryCount
  }

  /// Embedded in a paused notification's userInfo so tapping Resume can reconstruct the full
  /// params and call startUpload directly — mirrors Android's resumePendingIntent, which embeds
  /// every field in the Intent extras rather than depending on any in-memory/JS state.
  var asUserInfo: [String: Any] {
    var info: [String: Any] = [
      "kind": "upload",
      "transferId": transferId,
      "localUri": localUri,
      "fileName": fileName,
      "mimeType": mimeType,
      "baseUrl": baseUrl,
      "uploadId": uploadId,
      "totalChunks": totalChunks,
      "startChunk": startChunk,
      "retryCount": retryCount
    ]
    if let folderId {
      info["folderId"] = folderId
    }
    return info
  }

  init?(userInfo: [AnyHashable: Any]) {
    guard let transferId = userInfo["transferId"] as? String,
          let localUri = userInfo["localUri"] as? String,
          let fileName = userInfo["fileName"] as? String,
          let mimeType = userInfo["mimeType"] as? String,
          let baseUrl = userInfo["baseUrl"] as? String,
          let uploadId = userInfo["uploadId"] as? String,
          let totalChunks = userInfo["totalChunks"] as? Int,
          let startChunk = userInfo["startChunk"] as? Int,
          let retryCount = userInfo["retryCount"] as? Int else {
      return nil
    }
    self.init(
      transferId: transferId,
      localUri: localUri,
      fileName: fileName,
      mimeType: mimeType,
      folderId: userInfo["folderId"] as? String,
      baseUrl: baseUrl,
      uploadId: uploadId,
      totalChunks: totalChunks,
      startChunk: startChunk,
      retryCount: retryCount
    )
  }
}

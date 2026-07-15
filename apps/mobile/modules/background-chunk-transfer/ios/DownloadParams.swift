import Foundation

struct DownloadParams {
  let transferId: String
  let fileId: String
  let url: String
  let destPath: String
  let fileName: String
  let baseUrl: String

  init(transferId: String, fileId: String, url: String, destPath: String, fileName: String, baseUrl: String) {
    self.transferId = transferId
    self.fileId = fileId
    self.url = url
    self.destPath = destPath
    self.fileName = fileName
    self.baseUrl = baseUrl
  }

  init(options: StartDownloadOptions) {
    self.transferId = options.transferId
    self.fileId = options.fileId
    self.url = options.url
    self.destPath = options.destPath
    self.fileName = options.fileName
    self.baseUrl = options.baseUrl
  }

  /// "kind" disambiguates from UploadParams.asUserInfo when the shared notification's Resume
  /// action is tapped — both param types populate the same userInfo dict.
  var asUserInfo: [String: Any] {
    [
      "kind": "download",
      "transferId": transferId,
      "fileId": fileId,
      "url": url,
      "destPath": destPath,
      "fileName": fileName,
      "baseUrl": baseUrl
    ]
  }

  init?(userInfo: [AnyHashable: Any]) {
    guard let transferId = userInfo["transferId"] as? String,
          let fileId = userInfo["fileId"] as? String,
          let url = userInfo["url"] as? String,
          let destPath = userInfo["destPath"] as? String,
          let fileName = userInfo["fileName"] as? String,
          let baseUrl = userInfo["baseUrl"] as? String else {
      return nil
    }
    self.init(transferId: transferId, fileId: fileId, url: url, destPath: destPath, fileName: fileName, baseUrl: baseUrl)
  }
}

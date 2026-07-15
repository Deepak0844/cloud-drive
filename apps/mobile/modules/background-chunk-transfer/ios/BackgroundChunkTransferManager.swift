import Foundation
import UserNotifications

enum TransferTaskKind {
  case chunk(index: Int)
  case finalize

  var isFinalize: Bool {
    if case .finalize = self { return true }
    return false
  }
}

struct TransferTaskMeta {
  let transferId: String
  let kind: TransferTaskKind
  let tempFileUrl: URL
}

/// Core background chunk-upload engine, mirroring BackgroundChunkTransferService.kt's chunk
/// loop and executeAuthenticated retry-on-401 logic. Driven by URLSessionDelegate callbacks
/// rather than sequential blocking calls, since a background URLSession's tasks are
/// system-managed and keep running after the app suspends or is terminated by the OS.
public final class BackgroundChunkTransferManager: NSObject {
  public static let shared = BackgroundChunkTransferManager()
  public static let sessionIdentifier = "expo.modules.backgroundchunktransfer.session"

  private static let chunkSize = 5 * 1024 * 1024

  // Single fixed identifier — only one transfer is ever active at a time, so re-adding a
  // request with this same identifier updates the existing notification in place rather than
  // stacking, mirroring Android's single shared NOTIFICATION_ID.
  private static let notificationIdentifier = "expo.modules.backgroundchunktransfer.progress"
  private static let categoryActive = "TRANSFER_ACTIVE"
  private static let categoryPaused = "TRANSFER_PAUSED"
  private static let pauseActionId = "PAUSE_ACTION"
  private static let resumeActionId = "RESUME_ACTION"
  private static let stopActionId = "STOP_ACTION"

  private var currentParams: UploadParams?
  private var isStoppedByUser = false
  // Only one task is ever in flight at a time (the chunk loop is sequential), so a single slot
  // is enough for pause/cancel to reach the active task directly — mirrors Android's currentCall.
  private var currentTask: URLSessionTask?
  private var currentUploadedChunks = 0
  private var lastNotifiedPercent = -1

  private var taskMeta: [Int: TransferTaskMeta] = [:]
  private var responseBuffers: [Int: Data] = [:]

  // MARK: Download state — single-request streaming, no chunking (see startDownload).
  private var currentDownloadParams: DownloadParams?
  private var currentDownloadTask: URLSessionDownloadTask?
  private var currentDownloadedBytes: Int64 = 0
  private var currentTotalBytes: Int64 = -1
  private var downloadTaskIds: Set<Int> = []
  // Keyed by transferId — populated asynchronously by cancel(byProducingResumeData:) when the
  // user pauses, consumed by the next startDownload() call for that transferId to resume via
  // the OS's native resumeData mechanism rather than a manually-tracked byte offset.
  private var pausedResumeData: [String: Data] = [:]

  private var backgroundCompletionHandler: (() -> Void)?

  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
    config.isDiscretionary = false
    config.sessionSendsLaunchEvents = true
    return URLSession(configuration: config, delegate: self, delegateQueue: nil)
  }()

  private override init() {
    super.init()
    Self.registerNotificationCategories()
    UNUserNotificationCenter.current().delegate = self
  }

  /// Registers the Pause/Stop and Resume/Stop action sets once per process launch. Called from
  /// this singleton's init rather than lazily on first upload, and the AppDelegate plugin forces
  /// `.shared` to initialize during didFinishLaunching specifically so this registration (and
  /// the delegate assignment above) happens on every app launch — including a cold launch
  /// triggered by tapping a notification action — not just whenever the first upload starts.
  private static func registerNotificationCategories() {
    let pauseAction = UNNotificationAction(identifier: pauseActionId, title: "Pause", options: [])
    let stopAction = UNNotificationAction(identifier: stopActionId, title: "Stop", options: [.destructive])
    let resumeAction = UNNotificationAction(identifier: resumeActionId, title: "Resume", options: [])

    let activeCategory = UNNotificationCategory(
      identifier: categoryActive, actions: [pauseAction, stopAction], intentIdentifiers: [], options: []
    )
    let pausedCategory = UNNotificationCategory(
      identifier: categoryPaused, actions: [resumeAction, stopAction], intentIdentifiers: [], options: []
    )
    UNUserNotificationCenter.current().setNotificationCategories([activeCategory, pausedCategory])
  }

  /// Called from AppDelegate's handleEventsForBackgroundURLSession hook (wired in a later
  /// checkpoint) so the system-provided completion handler runs once all relaunch-driven
  /// delegate callbacks have drained.
  public func setBackgroundCompletionHandler(_ handler: @escaping () -> Void) {
    backgroundCompletionHandler = handler
  }

  // MARK: - Public API

  func startUpload(_ params: UploadParams) {
    isStoppedByUser = false
    currentParams = params
    currentUploadedChunks = params.startChunk
    lastNotifiedPercent = -1
    TransferEventBus.activeTransferId = params.transferId
    emitEvent(transferId: params.transferId, type: "upload", status: "active", progress: initialProgress(params))
    showActiveNotification(params: params, progress: Int(initialProgress(params)))
    uploadChunk(params, chunkIndex: params.startChunk)
  }

  func startDownload(_ params: DownloadParams) {
    isStoppedByUser = false
    currentDownloadParams = params
    currentDownloadedBytes = 0
    currentTotalBytes = -1
    lastNotifiedPercent = -1
    TransferEventBus.activeTransferId = params.transferId
    emitEvent(transferId: params.transferId, type: "download", status: "active", progress: 0)
    showActiveDownloadNotification(params: params, progress: 0)
    let resumeData = pausedResumeData.removeValue(forKey: params.transferId)
    beginDownloadTask(params: params, resumeData: resumeData)
  }

  func pause(transferId: String) {
    if currentParams?.transferId == transferId {
      stopActiveTransfer(transferId: transferId, status: "paused")
    } else if currentDownloadParams?.transferId == transferId {
      pauseDownload(transferId: transferId)
    }
  }

  func cancel(transferId: String) {
    if currentParams?.transferId == transferId {
      stopActiveTransfer(transferId: transferId, status: "cancelled")
    } else if currentDownloadParams?.transferId == transferId {
      cancelDownload(transferId: transferId)
    }
  }

  /// Cancelling currentTask triggers didCompleteWithError asynchronously for that task too, but
  /// isStoppedByUser is checked first there, so it only cleans up the temp file and returns
  /// without re-emitting or overwriting the status set here.
  private func stopActiveTransfer(transferId: String, status: String) {
    guard let params = currentParams, params.transferId == transferId else { return }
    isStoppedByUser = true
    currentTask?.cancel()
    emitEvent(transferId: transferId, type: "upload", status: status, progress: nil)
    currentParams = nil
    TransferEventBus.activeTransferId = nil

    if status == "paused" {
      SqliteProgressWriter.markPaused(transferId: transferId)
      showPausedNotification(params.with(startChunk: currentUploadedChunks))
    } else {
      SqliteProgressWriter.markCancelled(transferId: transferId)
      clearNotification()
    }
  }

  private func pauseDownload(transferId: String) {
    guard let params = currentDownloadParams, params.transferId == transferId else { return }
    isStoppedByUser = true
    currentDownloadTask?.cancel { [weak self] resumeData in
      guard let resumeData else { return }
      DispatchQueue.main.async {
        self?.pausedResumeData[transferId] = resumeData
      }
    }
    emitEvent(transferId: transferId, type: "download", status: "paused", progress: nil)
    currentDownloadParams = nil
    TransferEventBus.activeTransferId = nil
    SqliteProgressWriter.markPaused(transferId: transferId)
    showPausedDownloadNotification(params)
  }

  private func cancelDownload(transferId: String) {
    guard currentDownloadParams?.transferId == transferId else { return }
    isStoppedByUser = true
    currentDownloadTask?.cancel()
    pausedResumeData.removeValue(forKey: transferId)
    emitEvent(transferId: transferId, type: "download", status: "cancelled", progress: nil)
    currentDownloadParams = nil
    TransferEventBus.activeTransferId = nil
    SqliteProgressWriter.markCancelled(transferId: transferId)
    clearNotification()
  }

  // MARK: - Chunk loop

  private func initialProgress(_ params: UploadParams) -> Double {
    params.totalChunks > 0 ? (Double(params.startChunk) * 100.0) / Double(params.totalChunks) : 0
  }

  private func uploadChunk(_ params: UploadParams, chunkIndex: Int) {
    guard let sourceUrl = localFileUrl(from: params.localUri) else {
      failTransfer(params, reason: "Cannot resolve local file URI - \(params.localUri)")
      return
    }

    do {
      let handle = try FileHandle(forReadingFrom: sourceUrl)
      defer { try? handle.close() }
      try handle.seek(toOffset: UInt64(chunkIndex) * UInt64(Self.chunkSize))
      let bytes = handle.readData(ofLength: Self.chunkSize)

      let tempUrl = FileManager.default.temporaryDirectory
        .appendingPathComponent("chunk-\(params.transferId)-\(chunkIndex).bin")
      try bytes.write(to: tempUrl, options: .atomic)

      guard let token = SecureStoreReader.readValue(key: "access_token") else {
        try? FileManager.default.removeItem(at: tempUrl)
        failTransfer(params, reason: "No access token available")
        return
      }

      let url = URL(string: "\(params.baseUrl)/api/v1/files/upload/chunk?uploadId=\(params.uploadId)&chunkIndex=\(chunkIndex)")!
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")

      let task = session.uploadTask(with: request, fromFile: tempUrl)
      taskMeta[task.taskIdentifier] = TransferTaskMeta(transferId: params.transferId, kind: .chunk(index: chunkIndex), tempFileUrl: tempUrl)
      currentTask = task
      task.resume()
    } catch {
      failTransfer(params, reason: "Chunk read/write failed - \(error.localizedDescription)")
    }
  }

  private func finalizeUpload(_ params: UploadParams) {
    guard let token = SecureStoreReader.readValue(key: "access_token") else {
      failTransfer(params, reason: "No access token available")
      return
    }

    guard let sourceUrl = localFileUrl(from: params.localUri),
          let attrs = try? FileManager.default.attributesOfItem(atPath: sourceUrl.path),
          let size = attrs[.size] as? Int else {
      failTransfer(params, reason: "Cannot read source file size for finalize")
      return
    }

    // folderId/totalSize are always present (folderId as explicit null when absent), matching
    // the Kotlin/JS finalize payloads exactly — the server's finalize validation requires both
    // keys present regardless of value.
    let body: [String: Any] = [
      "uploadId": params.uploadId,
      "fileName": params.fileName,
      "mimeType": params.mimeType,
      "folderId": params.folderId ?? NSNull(),
      "totalSize": size
    ]

    guard let jsonData = try? JSONSerialization.data(withJSONObject: body) else {
      failTransfer(params, reason: "Cannot encode finalize body")
      return
    }

    let tempUrl = FileManager.default.temporaryDirectory
      .appendingPathComponent("finalize-\(params.transferId).json")
    do {
      try jsonData.write(to: tempUrl, options: .atomic)
    } catch {
      failTransfer(params, reason: "Cannot write finalize temp file - \(error.localizedDescription)")
      return
    }

    let url = URL(string: "\(params.baseUrl)/api/v1/files/upload/finalize")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let task = session.uploadTask(with: request, fromFile: tempUrl)
    taskMeta[task.taskIdentifier] = TransferTaskMeta(transferId: params.transferId, kind: .finalize, tempFileUrl: tempUrl)
    currentTask = task
    task.resume()
  }

  // MARK: - Helpers

  private func failTransfer(_ params: UploadParams, reason: String) {
    NSLog("[BackgroundChunkTransfer] #uploadChunk :: transfer failed - \(params.transferId) - \(reason)")
    emitEvent(transferId: params.transferId, type: "upload", status: "failed", progress: nil)
    currentParams = nil
    TransferEventBus.activeTransferId = nil
    SqliteProgressWriter.markFailed(transferId: params.transferId, retryCount: params.retryCount + 1)
    clearNotification()
  }

  private func failDownload(_ params: DownloadParams, reason: String) {
    NSLog("[BackgroundChunkTransfer] #downloadFile :: transfer failed - \(params.transferId) - \(reason)")
    emitEvent(transferId: params.transferId, type: "download", status: "failed", progress: nil)
    currentDownloadParams = nil
    currentDownloadTask = nil
    TransferEventBus.activeTransferId = nil
    SqliteProgressWriter.markFailed(transferId: params.transferId, retryCount: 0)
    clearNotification()
  }

  private func emitEvent(
    transferId: String,
    type: String,
    status: String,
    progress: Double?,
    cloudFileId: String? = nil,
    localUri: String? = nil
  ) {
    TransferEventBus.emit([
      "transferId": transferId,
      "type": type,
      "status": status,
      "progress": progress,
      "cloudFileId": cloudFileId,
      "localUri": localUri
    ])
  }

  private func parseCloudFileId(from data: Data?) -> String? {
    guard let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let payload = json["data"] as? [String: Any] else {
      return nil
    }
    if let id = payload["_id"] as? String, !id.isEmpty { return id }
    if let id = payload["id"] as? String, !id.isEmpty { return id }
    return nil
  }

  private func localFileUrl(from uriString: String) -> URL? {
    if let url = URL(string: uriString), url.scheme == "file" {
      return url
    }
    return URL(fileURLWithPath: uriString)
  }

  // MARK: - Download engine (single request, no chunking — server-side Range support plus
  // URLSessionDownloadTask's native resumeData mechanism handle resumability at the protocol
  // level, unlike uploads which need the manual chunk-chaining engine above).

  private func beginDownloadTask(params: DownloadParams, resumeData: Data?) {
    let task: URLSessionDownloadTask
    if let resumeData {
      task = session.downloadTask(withResumeData: resumeData)
    } else {
      guard let token = SecureStoreReader.readValue(key: "access_token") else {
        failDownload(params, reason: "No access token available")
        return
      }
      guard let url = URL(string: params.url) else {
        failDownload(params, reason: "Cannot resolve download URL - \(params.url)")
        return
      }
      var request = URLRequest(url: url)
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      task = session.downloadTask(with: request)
    }

    downloadTaskIds.insert(task.taskIdentifier)
    currentDownloadTask = task
    task.resume()
  }

  /// Unlike chunk uploads, a 401 on a download means the entire response body is just a small
  /// error payload — there's nothing meaningful to resume, so this restarts the download from
  /// scratch with a freshly-refreshed token rather than attempting resumeData.
  private func handleDownloadUnauthorized(params: DownloadParams) {
    guard (try? TokenRefresher.refresh(session: URLSession(configuration: .ephemeral), baseUrl: params.baseUrl)) != nil else {
      failDownload(params, reason: "Token refresh failed after 401")
      return
    }
    beginDownloadTask(params: params, resumeData: nil)
  }

  // MARK: - Notifications (silent, throttled to whole-percent, in-place updates only)

  private func showActiveNotification(params: UploadParams, progress: Int) {
    guard progress != lastNotifiedPercent else { return }
    lastNotifiedPercent = progress

    let content = UNMutableNotificationContent()
    content.title = "Uploading \(params.fileName)"
    content.body = "\(progress)%"
    content.categoryIdentifier = Self.categoryActive
    content.userInfo = params.with(startChunk: currentUploadedChunks).asUserInfo
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
  }

  private func showPausedNotification(_ params: UploadParams) {
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
    lastNotifiedPercent = -1
  }

  private func showCompleteNotification(fileName: String) {
    let content = UNMutableNotificationContent()
    content.title = "Uploaded \(fileName)"
    content.body = "Tap to open"
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
    lastNotifiedPercent = -1
  }

  private func clearNotification() {
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [Self.notificationIdentifier])
    center.removePendingNotificationRequests(withIdentifiers: [Self.notificationIdentifier])
    lastNotifiedPercent = -1
  }

  private func showActiveDownloadNotification(params: DownloadParams, progress: Int) {
    guard progress != lastNotifiedPercent else { return }
    lastNotifiedPercent = progress

    let content = UNMutableNotificationContent()
    content.title = "Downloading \(params.fileName)"
    content.body = "\(progress)%"
    content.categoryIdentifier = Self.categoryActive
    content.userInfo = params.asUserInfo
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
  }

  private func showPausedDownloadNotification(_ params: DownloadParams) {
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
    lastNotifiedPercent = -1
  }

  private func showDownloadCompleteNotification(fileName: String) {
    let content = UNMutableNotificationContent()
    content.title = "Downloaded \(fileName)"
    content.body = "Tap to open"
    content.sound = nil

    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
    lastNotifiedPercent = -1
  }
}

// MARK: - UNUserNotificationCenterDelegate (Pause/Resume/Stop from the notification itself)

extension BackgroundChunkTransferManager: UNUserNotificationCenterDelegate {
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    defer { completionHandler() }
    let userInfo = response.notification.request.content.userInfo
    guard let transferId = userInfo["transferId"] as? String else { return }

    switch response.actionIdentifier {
    case Self.pauseActionId:
      pause(transferId: transferId)
    case Self.stopActionId:
      cancel(transferId: transferId)
    case Self.resumeActionId:
      if userInfo["kind"] as? String == "download" {
        guard let resumeParams = DownloadParams(userInfo: userInfo) else { return }
        startDownload(resumeParams)
      } else {
        guard let resumeParams = UploadParams(userInfo: userInfo) else { return }
        startUpload(resumeParams)
      }
    default:
      break
    }
  }

  /// Lets the silent progress notification show while the app is in the foreground too — without
  /// this, foreground-delivered local notifications are suppressed by default.
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .list])
  }
}

// MARK: - URLSessionDataDelegate (response body capture — upload tasks are data tasks under the hood)

extension BackgroundChunkTransferManager: URLSessionDataDelegate {
  public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    var buffer = responseBuffers[dataTask.taskIdentifier] ?? Data()
    buffer.append(data)
    responseBuffers[dataTask.taskIdentifier] = buffer
  }
}

// MARK: - URLSessionTaskDelegate (chunk chaining, mirrors runUpload's chunk loop)

extension BackgroundChunkTransferManager: URLSessionTaskDelegate {
  public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if downloadTaskIds.contains(task.taskIdentifier) {
      handleDownloadTaskCompletion(taskIdentifier: task.taskIdentifier, error: error)
      return
    }

    guard let meta = taskMeta.removeValue(forKey: task.taskIdentifier) else { return }
    let responseData = responseBuffers.removeValue(forKey: task.taskIdentifier)
    let statusCode = (task.response as? HTTPURLResponse)?.statusCode

    if isStoppedByUser {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    guard let params = currentParams, params.transferId == meta.transferId else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    if let error {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      failTransfer(params, reason: error.localizedDescription)
      return
    }

    if statusCode == 401 {
      handleUnauthorized(params: params, meta: meta)
      return
    }

    guard let statusCode, (200...299).contains(statusCode) else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      failTransfer(params, reason: "HTTP \(statusCode ?? -1)")
      return
    }

    // Success — per the ratified decision, each chunk's temp file is deleted as soon as its
    // upload is acknowledged, rather than accumulating until the whole transfer finishes.
    try? FileManager.default.removeItem(at: meta.tempFileUrl)

    switch meta.kind {
    case .chunk(let index):
      let uploadedChunks = index + 1
      currentUploadedChunks = uploadedChunks
      let progress = (Double(uploadedChunks) * 100.0) / Double(params.totalChunks)
      emitEvent(transferId: params.transferId, type: "upload", status: "active", progress: progress)
      SqliteProgressWriter.updateProgress(transferId: params.transferId, progress: progress, uploadedChunks: uploadedChunks)
      showActiveNotification(params: params, progress: Int(progress))
      if uploadedChunks >= params.totalChunks {
        finalizeUpload(params)
      } else {
        uploadChunk(params, chunkIndex: uploadedChunks)
      }
    case .finalize:
      let cloudFileId = parseCloudFileId(from: responseData)
      emitEvent(transferId: params.transferId, type: "upload", status: "complete", progress: 100.0, cloudFileId: cloudFileId)
      currentParams = nil
      TransferEventBus.activeTransferId = nil
      SqliteProgressWriter.markComplete(transferId: params.transferId)
      showCompleteNotification(fileName: params.fileName)
    }
  }

  /// Mirrors executeAuthenticated's 401-then-retry-once behavior — refreshes the token and
  /// re-uploads the SAME temp file (not yet deleted) rather than re-reading the chunk from the
  /// source file, since the bytes already on disk are still correct.
  private func handleUnauthorized(params: UploadParams, meta: TransferTaskMeta) {
    guard let newToken = try? TokenRefresher.refresh(session: URLSession(configuration: .ephemeral), baseUrl: params.baseUrl) else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      failTransfer(params, reason: "Token refresh failed after 401")
      return
    }

    let url: URL
    switch meta.kind {
    case .chunk(let index):
      url = URL(string: "\(params.baseUrl)/api/v1/files/upload/chunk?uploadId=\(params.uploadId)&chunkIndex=\(index)")!
    case .finalize:
      url = URL(string: "\(params.baseUrl)/api/v1/files/upload/finalize")!
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
    request.setValue(meta.kind.isFinalize ? "application/json" : "application/octet-stream", forHTTPHeaderField: "Content-Type")

    let retryTask = session.uploadTask(with: request, fromFile: meta.tempFileUrl)
    taskMeta[retryTask.taskIdentifier] = meta
    currentTask = retryTask
    retryTask.resume()
  }

  /// For a successful download, urlSession(_:downloadTask:didFinishDownloadingTo:) already
  /// handled completion and removed this taskIdentifier from downloadTaskIds before this fires
  /// (error == nil in that case) — this only has real work to do for a genuine failure. A
  /// user-initiated pause/cancel already wrote its own terminal state before triggering this,
  /// so isStoppedByUser being true here means "nothing more to do," not "something went wrong."
  private func handleDownloadTaskCompletion(taskIdentifier: Int, error: Error?) {
    downloadTaskIds.remove(taskIdentifier)
    guard let error else { return }
    guard !isStoppedByUser else { return }
    guard let params = currentDownloadParams else { return }
    failDownload(params, reason: error.localizedDescription)
  }
}

// MARK: - URLSessionDownloadDelegate (single-request download, native OS resumability)

extension BackgroundChunkTransferManager: URLSessionDownloadDelegate {
  public func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    // Must match the specific currentDownloadTask, not just "any known download task id" — a
    // task that was just cancelled via pause (then immediately resumed under the same
    // transferId) can keep delivering residual buffered didWriteData calls for a brief window
    // after being superseded; without this identity check those stale calls would be
    // misattributed to the new task since both share the same transferId.
    guard downloadTask === currentDownloadTask, let params = currentDownloadParams else { return }
    currentDownloadedBytes = totalBytesWritten
    currentTotalBytes = totalBytesExpectedToWrite
    guard totalBytesExpectedToWrite > 0 else { return }

    let progress = (Double(totalBytesWritten) * 100.0) / Double(totalBytesExpectedToWrite)
    if Int(progress) != lastNotifiedPercent {
      emitEvent(transferId: params.transferId, type: "download", status: "active", progress: progress)
      SqliteProgressWriter.updateProgress(transferId: params.transferId, progress: progress, uploadedChunks: 0)
      showActiveDownloadNotification(params: params, progress: Int(progress))
    }
  }

  public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
    guard downloadTask === currentDownloadTask, let params = currentDownloadParams else { return }

    let statusCode = (downloadTask.response as? HTTPURLResponse)?.statusCode
    if statusCode == 401 {
      downloadTaskIds.remove(downloadTask.taskIdentifier)
      handleDownloadUnauthorized(params: params)
      return
    }
    guard let statusCode, (200...299).contains(statusCode) else {
      downloadTaskIds.remove(downloadTask.taskIdentifier)
      failDownload(params, reason: "HTTP \(statusCode ?? -1)")
      return
    }

    // destPath arrives as a file:// URI, matching the same convention as localUri for uploads.
    guard let destUrl = localFileUrl(from: params.destPath) else {
      downloadTaskIds.remove(downloadTask.taskIdentifier)
      failDownload(params, reason: "Cannot resolve destination path - \(params.destPath)")
      return
    }

    do {
      try FileManager.default.createDirectory(at: destUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
      try? FileManager.default.removeItem(at: destUrl)
      try FileManager.default.moveItem(at: location, to: destUrl)
    } catch {
      downloadTaskIds.remove(downloadTask.taskIdentifier)
      failDownload(params, reason: "Cannot move downloaded file - \(error.localizedDescription)")
      return
    }

    downloadTaskIds.remove(downloadTask.taskIdentifier)
    currentDownloadParams = nil
    currentDownloadTask = nil
    TransferEventBus.activeTransferId = nil
    emitEvent(transferId: params.transferId, type: "download", status: "complete", progress: 100.0, localUri: params.destPath)
    SqliteProgressWriter.markComplete(transferId: params.transferId)
    showDownloadCompleteNotification(fileName: params.fileName)
  }
}

// MARK: - URLSessionDelegate (background session relaunch handoff)

extension BackgroundChunkTransferManager: URLSessionDelegate {
  public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    DispatchQueue.main.async { [weak self] in
      self?.backgroundCompletionHandler?()
      self?.backgroundCompletionHandler = nil
    }
  }
}

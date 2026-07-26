import Foundation
import UIKit
import UserNotifications

enum TransferTaskKind {
  case chunk(index: Int)
}

struct TransferTaskMeta {
  let transferId: String
  let kind: TransferTaskKind
  let tempFileUrl: URL
}

extension TransferTaskMeta {
  /// Stored on each chunk task's `taskDescription` so id + index survive a background relaunch (the
  /// in-memory taskMeta cache does not). Format: "<transferId>|chunk|<index>".
  var taskDescriptionValue: String {
    switch kind {
    case .chunk(let index): return "\(transferId)|chunk|\(index)"
    }
  }

  /// Rebuilds metadata from a relaunched chunk task's `taskDescription`. The temp-file URL is
  /// re-derived from its deterministic name (chunk-<id>-<index>.bin); that file may already be gone,
  /// which is fine — the next chunk reads from the durable source file.
  init?(taskDescription: String?) {
    guard let parts = taskDescription?.components(separatedBy: "|"), parts.count == 3, parts[1] == "chunk",
      let index = Int(parts[2])
    else {
      return nil
    }
    self.init(
      transferId: parts[0],
      kind: .chunk(index: index),
      tempFileUrl: FileManager.default.temporaryDirectory.appendingPathComponent("chunk-\(parts[0])-\(index).bin")
    )
  }
}

/// Core background chunk-upload engine, mirroring BackgroundChunkTransferService.kt. Driven by
/// URLSessionDelegate callbacks so a background session's tasks keep running after the app suspends
/// or is terminated by the OS.
public final class BackgroundChunkTransferManager: NSObject {
  public static let shared = BackgroundChunkTransferManager()
  public static let sessionIdentifier = "expo.modules.backgroundchunktransfer.session"

  private static let chunkSize = 5 * 1024 * 1024

  // Single fixed identifier — only one transfer runs at a time, so re-adding with this identifier
  // updates the notification in place instead of stacking (mirrors Android's single NOTIFICATION_ID).
  private static let notificationIdentifier = "expo.modules.backgroundchunktransfer.progress"
  private static let categoryActive = "TRANSFER_ACTIVE"
  private static let categoryPaused = "TRANSFER_PAUSED"
  private static let pauseActionId = "PAUSE_ACTION"
  private static let resumeActionId = "RESUME_ACTION"
  private static let stopActionId = "STOP_ACTION"

  private var currentParams: UploadParams?
  private var isStoppedByUser = false
  private var lastNotifiedPercent = -1

  // Windowed concurrent chunk upload: keeps a window of chunk tasks in flight rather than a strict
  // one-at-a-time chain, so nsurlsessiond keeps uploading while the app is suspended between iOS's
  // infrequent wake-ups. The server accepts chunks out of order; `contiguousCompleted` (the longest
  // 0..N received prefix) is the resume offset, matching the server's.
  //
  // Window size is disk-aware (see computeWindowSize): when free space allows the WHOLE file is queued
  // at once (smooth, no mid-file plateau, any size); when storage is tight it falls back to a sliding
  // window. Peak scratch is bounded by the budget below since each completed chunk's temp is deleted.
  //
  // Config knob: maxTempBudgetBytes caps scratch a single upload may queue (default 2 GB).
  private static let maxTempBudgetBytes: Int64 = 2 * 1024 * 1024 * 1024
  // Never queue temp files past this share of free disk, so an upload can't fill the volume.
  private static let freeDiskUsableFraction = 0.4
  // Floor for the sliding window when disk is constrained, so an upload still makes progress.
  private static let minWindowChunks = 6
  private var currentWindowSize = 1
  private var pendingChunkQueue: [Int] = []             // indices waiting to be scheduled (FIFO)
  private var inFlightChunkTasks: [Int: URLSessionTask] = [:]  // taskIdentifier -> chunk task
  private var completedChunkIndices: Set<Int> = []
  private var contiguousCompleted = 0
  private var isFinalizing = false
  // Access token read once per transfer and reused for its tasks — a per-chunk keychain read fails
  // while the device is locked, stalling a backgrounded upload. Refreshed on 401, cleared on terminal.
  private var cachedAccessToken: String?
  // Keeps the app alive across the finalize request when the last chunk lands in the background, so
  // the transfer flips to "complete" without waiting for iOS's next wake.
  private var finalizeBackgroundTask: UIBackgroundTaskIdentifier = .invalid

  private var taskMeta: [Int: TransferTaskMeta] = [:]
  private var responseBuffers: [Int: Data] = [:]

  // MARK: Download state — single-request streaming, no chunking (see startDownload).
  private var currentDownloadParams: DownloadParams?
  private var currentDownloadTask: URLSessionDownloadTask?
  private var currentDownloadedBytes: Int64 = 0
  private var currentTotalBytes: Int64 = -1
  private var downloadTaskIds: Set<Int> = []
  // Keyed by transferId — populated by cancel(byProducingResumeData:) on pause, consumed by the next
  // startDownload for that id to resume via the OS's native resumeData rather than a byte offset.
  private var pausedResumeData: [String: Data] = [:]

  private var backgroundCompletionHandler: (() -> Void)?

  // All mutable state above is accessed only on this serial queue: the public entry points hop onto
  // it and the URLSession delegate callbacks run on it (it backs the delegateQueue below), so a
  // button tap can never race a chunk-completion callback mutating these collections.
  private let workQueue = DispatchQueue(label: "expo.modules.backgroundchunktransfer.work")

  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
    config.isDiscretionary = false
    config.sessionSendsLaunchEvents = true
    let delegateQueue = OperationQueue()
    delegateQueue.maxConcurrentOperationCount = 1
    delegateQueue.underlyingQueue = workQueue
    return URLSession(configuration: config, delegate: self, delegateQueue: delegateQueue)
  }()

  private override init() {
    super.init()
    Self.registerNotificationCategories()
    UNUserNotificationCenter.current().delegate = self
    // Eagerly recreate the background session on every launch — including a background relaunch to
    // deliver a terminated transfer's session events. Without a delegate reconnected here those
    // pending callbacks (and the rehydrate path in didCompleteWithError) wouldn't fire until the app
    // was next foregrounded. (.shared is forced to init on every launch by the AppDelegate plugin.)
    _ = self.session
  }

  /// Registers the Pause/Stop and Resume/Stop action sets once per launch. Called from init (not
  /// lazily on first upload) so it runs on every launch — including a cold launch from tapping a
  /// notification action — via the AppDelegate plugin forcing `.shared` to initialize.
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

  /// Called from AppDelegate's handleEventsForBackgroundURLSession hook so the system completion
  /// handler runs once all relaunch-driven delegate callbacks have drained.
  public func setBackgroundCompletionHandler(_ handler: @escaping () -> Void) {
    workQueue.async { [weak self] in self?.backgroundCompletionHandler = handler }
  }

  // MARK: - Public API

  /// The transfer currently owning the single tracking slot, regardless of kind — used by the busy
  /// guard below. Only one of currentParams/currentDownloadParams is ever non-nil.
  private var activeTransferId: String? {
    currentParams?.transferId ?? currentDownloadParams?.transferId
  }

  func startUpload(_ params: UploadParams) { workQueue.async { [weak self] in self?._startUpload(params) } }

  private func _startUpload(_ params: UploadParams) {
    if let activeId = activeTransferId, activeId != params.transferId {
      emitEvent(transferId: params.transferId, type: "upload", status: "busy", progress: nil)
      return
    }
    isStoppedByUser = false
    currentParams = params
    lastNotifiedPercent = -1
    resetUploadWindow(startChunk: params.startChunk, totalChunks: params.totalChunks)
    // Read the token once now (foreground → keychain unlocked) and reuse it for every task; a fresh
    // read replaces any stale token cached from a previous transfer.
    cachedAccessToken = SecureStoreReader.readValue(key: "access_token")
    TransferEventBus.activeTransferId = params.transferId
    // Persist static params so a background relaunch after termination can rehydrate and finish
    // headlessly (see didCompleteWithError's rehydrate branch).
    TransferResumeStore.write(params)
    emitEvent(transferId: params.transferId, type: "upload", status: "active", progress: initialProgress(params))
    // Live Activity is the progress surface while it exists.
    TransferActivityController.shared.start(transferId: params.transferId, fileName: params.fileName, type: "upload")
    TransferActivityController.shared.update(progress: initialProgress(params))
    if TransferActivityController.shared.isActive {
      // The Activity owns the surface — clear any progress notification orphaned by a prior process
      // (notifications survive app death too), so the two don't both linger.
      clearNotification()
    } else {
      showActiveNotification(params: params, progress: Int(initialProgress(params)))
    }
    fillUploadWindow()
  }

  // MARK: - Upload window (concurrent chunk scheduling)

  /// (Re)initializes the window state for a transfer resuming from `startChunk`. Chunks before the
  /// offset are treated as already received (the server holds them); the rest are queued.
  private func resetUploadWindow(startChunk: Int, totalChunks: Int) {
    pendingChunkQueue = startChunk < totalChunks ? Array(startChunk..<totalChunks) : []
    inFlightChunkTasks = [:]
    completedChunkIndices = Set(0..<max(startChunk, 0))
    contiguousCompleted = max(startChunk, 0)
    currentWindowSize = computeWindowSize(totalChunks: totalChunks)
    isFinalizing = false
  }

  /// Chooses how many chunk tasks to keep queued. Budget is the smaller of the configured cap and a
  /// safe share of free disk: if the whole file fits it's all queued (smooth at any size); otherwise
  /// the largest window the budget allows, floored at minWindowChunks so a low-disk device still uploads.
  private func computeWindowSize(totalChunks: Int) -> Int {
    let budgetBytes = min(Self.maxTempBudgetBytes, Int64(Double(Self.availableDiskBytes()) * Self.freeDiskUsableFraction))
    let byBudget = Int(budgetBytes / Int64(Self.chunkSize))
    return min(max(1, totalChunks), max(Self.minWindowChunks, byBudget))
  }

  /// Free space on the volume backing the temp directory, in bytes ("important usage" capacity —
  /// what the OS will actually let the app use). Falls back to the configured budget if unreadable.
  private static func availableDiskBytes() -> Int64 {
    if let values = try? FileManager.default.temporaryDirectory.resourceValues(
      forKeys: [.volumeAvailableCapacityForImportantUsageKey]
    ), let capacity = values.volumeAvailableCapacityForImportantUsage {
      return capacity
    }
    return maxTempBudgetBytes
  }

  /// Keeps up to currentWindowSize chunk tasks in flight, pulling from the pending queue. Called at
  /// start and after each completion — this is what keeps nsurlsessiond uploading while suspended.
  private func fillUploadWindow() {
    guard let params = currentParams, !isStoppedByUser, !isFinalizing else { return }
    while inFlightChunkTasks.count < currentWindowSize, !pendingChunkQueue.isEmpty {
      let index = pendingChunkQueue.removeFirst()
      uploadChunk(params, chunkIndex: index)
    }
  }

  /// Puts a chunk back at the front of the queue to retry (used when the OS cancelled a task rather
  /// than it completing). No-op if it already completed or is queued.
  private func requeueChunk(_ index: Int) {
    guard !completedChunkIndices.contains(index), !pendingChunkQueue.contains(index) else { return }
    pendingChunkQueue.insert(index, at: 0)
  }

  /// Cancels every in-flight chunk task and clears the queue — used on pause, cancel, and failure.
  private func cancelAllChunkTasks() {
    for task in inFlightChunkTasks.values {
      task.cancel()
    }
    inFlightChunkTasks = [:]
    pendingChunkQueue = []
  }

  /// Records a chunk as received, advances the contiguous-completed prefix (the resume offset),
  /// updates progress surfaces, and either finalizes (all chunks in) or refills the window.
  private func markChunkComplete(_ index: Int, params: UploadParams) {
    // Drop it from the queue in case a rehydrate re-queued the whole range — avoids re-uploading it.
    pendingChunkQueue.removeAll { $0 == index }
    completedChunkIndices.insert(index)
    while completedChunkIndices.contains(contiguousCompleted) {
      contiguousCompleted += 1
    }
    let done = completedChunkIndices.count
    let progress = params.totalChunks > 0 ? (Double(done) * 100.0) / Double(params.totalChunks) : 0
    emitEvent(transferId: params.transferId, type: "upload", status: "active", progress: progress)
    // Persist the contiguous prefix as uploaded_chunks (the server-authoritative resume offset); the
    // completed count drives the % shown.
    SqliteProgressWriter.updateProgress(transferId: params.transferId, progress: progress, uploadedChunks: contiguousCompleted)
    TransferActivityController.shared.update(progress: progress)
    showActiveNotification(params: params, progress: Int(progress))
    if done >= params.totalChunks {
      isFinalizing = true
      finalizeUpload(params)
    } else {
      fillUploadWindow()
    }
  }

  func startDownload(_ params: DownloadParams) { workQueue.async { [weak self] in self?._startDownload(params) } }

  private func _startDownload(_ params: DownloadParams) {
    if let activeId = activeTransferId, activeId != params.transferId {
      emitEvent(transferId: params.transferId, type: "download", status: "busy", progress: nil)
      return
    }
    isStoppedByUser = false
    currentDownloadParams = params
    currentDownloadedBytes = 0
    currentTotalBytes = -1
    lastNotifiedPercent = -1
    TransferEventBus.activeTransferId = params.transferId
    emitEvent(transferId: params.transferId, type: "download", status: "active", progress: 0)
    TransferActivityController.shared.start(transferId: params.transferId, fileName: params.fileName, type: "download")
    if TransferActivityController.shared.isActive {
      // See startUpload — the Activity is the surface; clear any orphaned progress notification.
      clearNotification()
    } else {
      showActiveDownloadNotification(params: params, progress: 0)
    }
    let resumeData = pausedResumeData.removeValue(forKey: params.transferId)
    beginDownloadTask(params: params, resumeData: resumeData)
  }

  func pause(transferId: String) { workQueue.async { [weak self] in self?._pause(transferId: transferId) } }

  private func _pause(transferId: String) {
    if currentParams?.transferId == transferId {
      // Once the last chunk lands, finalizeUpload posts the finalize request; cancelling that
      // client-side doesn't undo it server-side, leaving the row stuck "paused" with an uploadId
      // Resume's lookup 404s on. Finalize is a point of no return — let it resolve.
      guard !isFinalizing else { return }
      stopActiveTransfer(transferId: transferId, status: "paused")
    } else if currentDownloadParams?.transferId == transferId {
      pauseDownload(transferId: transferId)
    }
  }

  /// Restarts a paused upload natively — invoked by the Live Activity's Resume button, which may run
  /// in the background with no JS. Rebuilds params from the resume record + last-saved offset, flips
  /// the row to "active", and re-enters startUpload. No-op if another transfer holds the slot or the
  /// record is gone. Uploads only — a paused download resumes via the notification path instead.
  func resume(transferId: String) { workQueue.async { [weak self] in self?._resume(transferId: transferId) } }

  private func _resume(transferId: String) {
    guard currentParams == nil, currentDownloadParams == nil else { return }
    guard let restored = TransferResumeStore.read(transferId: transferId) else { return }
    let offset = SqliteProgressWriter.readUploadedChunks(transferId: transferId)
    // startUpload sets currentParams synchronously FIRST, then flip the status to "active". The other
    // order leaves a window where status is "active" but currentParams is nil, letting a straggler
    // completion from the cancelled pause tasks trip the rehydrate path and race a second scheduler.
    _startUpload(restored.with(startChunk: offset))
    SqliteProgressWriter.markActive(transferId: transferId)
  }

  func cancel(transferId: String) { workQueue.async { [weak self] in self?._cancel(transferId: transferId) } }

  private func _cancel(transferId: String) {
    if currentParams?.transferId == transferId {
      stopActiveTransfer(transferId: transferId, status: "cancelled")
    } else if currentDownloadParams?.transferId == transferId {
      cancelDownload(transferId: transferId)
    } else {
      // Not in flight — the transfer was already paused, which evicts it from currentParams. Stop
      // still needs to take effect for a paused row (both Stop buttons render regardless of status),
      // so mark it cancelled directly rather than no-op'ing (mirrors Android's handleStopSignal).
      let wasDownload = pausedResumeData.removeValue(forKey: transferId) != nil
      // SQLite write precedes the emit so a JS listener re-querying on the event sees "cancelled".
      SqliteProgressWriter.markCancelled(transferId: transferId)
      TransferResumeStore.remove(transferId: transferId)
      emitEvent(transferId: transferId, type: wasDownload ? "download" : "upload", status: "cancelled", progress: nil)
      // A paused transfer keeps its Live Activity on screen, so Stopping it here ends that card.
      TransferActivityController.shared.end(state: "cancelled", progress: 0)
    }
  }

  /// Cancelling the in-flight chunk tasks triggers didCompleteWithError per task, but isStoppedByUser
  /// is checked there first, so those only clean up temp files without overwriting the status set here.
  private func stopActiveTransfer(transferId: String, status: String) {
    guard let params = currentParams, params.transferId == transferId else { return }
    isStoppedByUser = true
    let resumeOffset = contiguousCompleted
    cancelAllChunkTasks()

    // SQLite write precedes the emit so a JS listener re-querying on the event sees the final
    // status, not the still-"active" row it would otherwise race against.
    if status == "paused" {
      SqliteProgressWriter.markPaused(transferId: transferId)
      // Keep the resume record on pause — resume(transferId:) reads it to restart natively. A
      // straggler cancellation can't auto-resume because the rehydrate path guards on status "active".
    } else {
      SqliteProgressWriter.markCancelled(transferId: transferId)
      TransferResumeStore.remove(transferId: transferId)
    }

    emitEvent(transferId: transferId, type: "upload", status: status, progress: nil)
    currentParams = nil
    cachedAccessToken = nil
    TransferEventBus.activeTransferId = nil

    let pausedProgress = params.totalChunks > 0
      ? (Double(resumeOffset) * 100.0) / Double(params.totalChunks)
      : 0

    if status == "paused" {
      // Keep the Live Activity on screen in its paused state (with Resume) rather than ending it — on
      // iOS the card is the sole control surface. The paused notification is only a fallback when
      // there's no Activity (see showPausedNotification's guard).
      TransferActivityController.shared.markPaused(progress: pausedProgress)
      showPausedNotification(params.with(startChunk: resumeOffset))
    } else {
      TransferActivityController.shared.end(state: "cancelled", progress: pausedProgress)
      clearNotification()
    }
  }

  private func pauseDownload(transferId: String) {
    guard let params = currentDownloadParams, params.transferId == transferId else { return }
    isStoppedByUser = true
    currentDownloadTask?.cancel { [weak self] resumeData in
      guard let resumeData else { return }
      self?.workQueue.async {
        self?.pausedResumeData[transferId] = resumeData
      }
    }
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "paused".
    SqliteProgressWriter.markPaused(transferId: transferId)
    emitEvent(transferId: transferId, type: "download", status: "paused", progress: nil)
    currentDownloadParams = nil
    TransferEventBus.activeTransferId = nil
    let pausedProgress = currentTotalBytes > 0
      ? (Double(currentDownloadedBytes) * 100.0) / Double(currentTotalBytes)
      : 0
    TransferActivityController.shared.markPaused(progress: pausedProgress)
    showPausedDownloadNotification(params)
  }

  private func cancelDownload(transferId: String) {
    guard currentDownloadParams?.transferId == transferId else { return }
    isStoppedByUser = true
    currentDownloadTask?.cancel()
    pausedResumeData.removeValue(forKey: transferId)
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "cancelled".
    SqliteProgressWriter.markCancelled(transferId: transferId)
    emitEvent(transferId: transferId, type: "download", status: "cancelled", progress: nil)
    currentDownloadParams = nil
    TransferEventBus.activeTransferId = nil
    TransferActivityController.shared.end(state: "cancelled", progress: 0)
    clearNotification()
  }

  // MARK: - Chunk loop

  private func initialProgress(_ params: UploadParams) -> Double {
    params.totalChunks > 0 ? (Double(params.startChunk) * 100.0) / Double(params.totalChunks) : 0
  }

  /// Returns the cached access token, reading the keychain once if not yet loaded (e.g. the first
  /// task after a background relaunch). Keeping it in memory means per-chunk tasks don't hit the
  /// keychain, which fails while the device is locked.
  private func accessToken() -> String? {
    if let cachedAccessToken { return cachedAccessToken }
    let token = SecureStoreReader.readValue(key: "access_token")
    cachedAccessToken = token
    return token
  }

  /// Requests a short background-execution assertion so the app stays alive to send the finalize
  /// request and flip to "complete" without waiting for iOS's next wake. Ended in finalize/failure.
  private func beginFinalizeAssertion() {
    endFinalizeAssertion()
    finalizeBackgroundTask = UIApplication.shared.beginBackgroundTask(withName: "transfer-finalize") { [weak self] in
      self?.endFinalizeAssertion()
    }
  }

  private func endFinalizeAssertion() {
    guard finalizeBackgroundTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(finalizeBackgroundTask)
    finalizeBackgroundTask = .invalid
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

      guard let token = accessToken() else {
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
      let meta = TransferTaskMeta(transferId: params.transferId, kind: .chunk(index: chunkIndex), tempFileUrl: tempUrl)
      taskMeta[task.taskIdentifier] = meta
      task.taskDescription = meta.taskDescriptionValue
      inFlightChunkTasks[task.taskIdentifier] = task
      task.resume()
    } catch {
      failTransfer(params, reason: "Chunk read/write failed - \(error.localizedDescription)")
    }
  }

  /// Finalizes SYNCHRONOUSLY inside the last chunk's delegate callback, on a non-background session.
  /// A background-session finalize would need a separate OS wake to deliver its completion, so a
  /// transfer hitting 100% while backgrounded would sit at "active" until the app was opened. Running
  /// it inline (under a brief background assertion) flips the row to "complete" before the app
  /// suspends. isFinalizing is already true, so pause is blocked and no new chunks schedule.
  private func finalizeUpload(_ params: UploadParams) {
    beginFinalizeAssertion()
    defer { endFinalizeAssertion() }

    guard let token = accessToken() else {
      failTransfer(params, reason: "No access token available")
      return
    }
    guard let sourceUrl = localFileUrl(from: params.localUri),
          let attrs = try? FileManager.default.attributesOfItem(atPath: sourceUrl.path),
          let size = attrs[.size] as? Int else {
      failTransfer(params, reason: "Cannot read source file size for finalize")
      return
    }

    // folderId/totalSize are always present (folderId as explicit null when absent), matching the
    // Kotlin/JS finalize payloads — the server requires both keys regardless of value.
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

    var (respData, statusCode) = syncFinalizeRequest(baseUrl: params.baseUrl, token: token, body: jsonData)
    // Mirror the chunk path's 401-then-retry-once: refresh the token and retry the finalize once.
    if statusCode == 401,
      let newToken = try? TokenRefresher.refresh(session: URLSession(configuration: .ephemeral), baseUrl: params.baseUrl) {
      cachedAccessToken = newToken
      (respData, statusCode) = syncFinalizeRequest(baseUrl: params.baseUrl, token: newToken, body: jsonData)
    }

    guard let statusCode, (200...299).contains(statusCode) else {
      failTransfer(params, reason: "Finalize failed - HTTP \(statusCode ?? -1)")
      return
    }

    let cloudFileId = parseCloudFileId(from: respData)
    // SQLite write precedes the emit so the JS listener's refreshNow sees the row as "complete".
    SqliteProgressWriter.markComplete(transferId: params.transferId)
    TransferResumeStore.remove(transferId: params.transferId)
    // Delete the durable documentDirectory upload copy (JS's own deleteAsync stays idempotent).
    try? FileManager.default.removeItem(at: sourceUrl)
    // Notification first (no-ops while the Activity is up), then end the Activity on "Uploaded".
    showCompleteNotification(fileName: params.fileName)
    emitEvent(transferId: params.transferId, type: "upload", status: "complete", progress: 100.0, cloudFileId: cloudFileId)
    currentParams = nil
    cachedAccessToken = nil
    TransferEventBus.activeTransferId = nil
    TransferActivityController.shared.end(state: "uploaded", progress: 100.0)
  }

  /// Sends the finalize POST and blocks the delegate queue until it completes, returning body +
  /// status. On an ephemeral session so completion is delivered in-process rather than via an OS
  /// wake; the timeout bounds the block if the network stalls.
  private func syncFinalizeRequest(baseUrl: String, token: String, body: Data) -> (Data?, Int?) {
    let url = URL(string: "\(baseUrl)/api/v1/files/upload/finalize")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body

    let semaphore = DispatchSemaphore(value: 0)
    var respData: Data?
    var statusCode: Int?
    let task = URLSession(configuration: .ephemeral).dataTask(with: request) { data, response, _ in
      respData = data
      statusCode = (response as? HTTPURLResponse)?.statusCode
      semaphore.signal()
    }
    task.resume()
    if semaphore.wait(timeout: .now() + 25) == .timedOut {
      task.cancel()
      return (nil, nil)
    }
    return (respData, statusCode)
  }

  // MARK: - Helpers

  private func failTransfer(_ params: UploadParams, reason: String) {
    NSLog("[BackgroundChunkTransfer] #uploadChunk :: transfer failed - \(params.transferId) - \(reason)")
    endFinalizeAssertion()
    // One chunk failing fails the whole transfer — cancel its still-in-flight siblings.
    cancelAllChunkTasks()
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "failed".
    SqliteProgressWriter.markFailed(transferId: params.transferId, retryCount: params.retryCount + 1)
    TransferResumeStore.remove(transferId: params.transferId)
    emitEvent(transferId: params.transferId, type: "upload", status: "failed", progress: nil)
    currentParams = nil
    cachedAccessToken = nil
    TransferEventBus.activeTransferId = nil
    TransferActivityController.shared.end(state: "failed", progress: 0)
    clearNotification()
  }

  private func failDownload(_ params: DownloadParams, reason: String) {
    NSLog("[BackgroundChunkTransfer] #downloadFile :: transfer failed - \(params.transferId) - \(reason)")
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "failed".
    SqliteProgressWriter.markFailed(transferId: params.transferId, retryCount: 0)
    emitEvent(transferId: params.transferId, type: "download", status: "failed", progress: nil)
    currentDownloadParams = nil
    currentDownloadTask = nil
    TransferEventBus.activeTransferId = nil
    TransferActivityController.shared.end(state: "failed", progress: 0)
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

  // MARK: - Download engine (single request, no chunking — server Range support + the native
  // resumeData mechanism handle resumability at the protocol level, unlike uploads above).

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

  /// A 401 on a download means the body is just a small error payload — nothing to resume, so this
  /// restarts from scratch with a refreshed token rather than attempting resumeData.
  private func handleDownloadUnauthorized(params: DownloadParams) {
    guard (try? TokenRefresher.refresh(session: URLSession(configuration: .ephemeral), baseUrl: params.baseUrl)) != nil else {
      failDownload(params, reason: "Token refresh failed after 401")
      return
    }
    beginDownloadTask(params: params, resumeData: nil)
  }

  // MARK: - Notifications (silent, throttled to whole-percent, in-place updates only)

  /// iOS does NOT replace an already-delivered (visible) notification just because a new request
  /// shares its identifier — that only applies to pending requests. Every notification here fires
  /// immediately (trigger: nil), so add() alone would stack; clearing the old one first makes this
  /// behave like Android's mutable notify(id, ...).
  private func postNotification(_ content: UNMutableNotificationContent) {
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [Self.notificationIdentifier])
    center.removePendingNotificationRequests(withIdentifiers: [Self.notificationIdentifier])
    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    center.add(request)
  }

  /// Used only for the paused-state notification, often posted from within didReceive's Pause
  /// handling — replacing the same-identifier notification the user just tapped, while iOS is still
  /// handling that tap, can silently drop the replacement. A short defer sidesteps that race.
  /// Progress ticks don't use this: they fire too often for a fixed delay to be safe.
  private func postNotificationDeferred(_ content: UNMutableNotificationContent) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
      self?.postNotification(content)
    }
  }

  private func showActiveNotification(params: UploadParams, progress: Int) {
    // While a Live Activity is live it is the progress surface — suppress the progress-tick
    // notification. Paused/complete notifications are unaffected. If the Activity never started
    // (disabled / request failed), isActive is false and this runs as before.
    guard !TransferActivityController.shared.isActive else { return }
    guard progress != lastNotifiedPercent else { return }
    lastNotifiedPercent = progress

    let content = UNMutableNotificationContent()
    content.title = "Uploading \(params.fileName)"
    content.body = "\(progress)%"
    content.categoryIdentifier = Self.categoryActive
    content.userInfo = params.with(startChunk: contiguousCompleted).asUserInfo
    content.sound = nil
    postNotification(content)
  }

  private func showPausedNotification(_ params: UploadParams) {
    // On iOS the Live Activity is the sole surface: while it's up (paused, with Resume) no paused
    // notification posts. This fires only as a fallback when Live Activities are unavailable.
    guard !TransferActivityController.shared.isActive else { return }
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil
    postNotificationDeferred(content)
    lastNotifiedPercent = -1
  }

  private func showCompleteNotification(fileName: String) {
    // Suppressed while a Live Activity is up — it shows the "Uploaded" state itself. Called before
    // the Activity is ended, so isActive still reflects the card.
    guard !TransferActivityController.shared.isActive else { return }
    let content = UNMutableNotificationContent()
    content.title = "Uploaded \(fileName)"
    content.body = "Tap to open"
    content.sound = nil
    postNotification(content)
    lastNotifiedPercent = -1
  }

  private func clearNotification() {
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [Self.notificationIdentifier])
    center.removePendingNotificationRequests(withIdentifiers: [Self.notificationIdentifier])
    lastNotifiedPercent = -1
  }

  private func showActiveDownloadNotification(params: DownloadParams, progress: Int) {
    // See showActiveNotification — suppressed while a Live Activity owns the progress surface.
    guard !TransferActivityController.shared.isActive else { return }
    guard progress != lastNotifiedPercent else { return }
    lastNotifiedPercent = progress

    let content = UNMutableNotificationContent()
    content.title = "Downloading \(params.fileName)"
    content.body = "\(progress)%"
    content.categoryIdentifier = Self.categoryActive
    content.userInfo = params.asUserInfo
    content.sound = nil
    postNotification(content)
  }

  private func showPausedDownloadNotification(_ params: DownloadParams) {
    guard !TransferActivityController.shared.isActive else { return }
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil
    postNotificationDeferred(content)
    lastNotifiedPercent = -1
  }

  private func showDownloadCompleteNotification(fileName: String) {
    guard !TransferActivityController.shared.isActive else { return }
    let content = UNMutableNotificationContent()
    content.title = "Downloaded \(fileName)"
    content.body = "Tap to open"
    content.sound = nil
    postNotification(content)
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

  /// Lets notifications show in the foreground too (otherwise suppressed by default). Progress ticks
  /// (categoryActive) get only the list entry, not a banner, so every percent change doesn't interrupt
  /// the user; paused/complete and other one-off changes still banner.
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if notification.request.content.categoryIdentifier == Self.categoryActive {
      completionHandler([.list])
    } else {
      completionHandler([.banner, .list])
    }
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

    // Recover task metadata from the in-memory cache, or — after a background relaunch that wiped
    // it — from the task's persisted description.
    guard let meta = taskMeta.removeValue(forKey: task.taskIdentifier)
      ?? TransferTaskMeta(taskDescription: task.taskDescription) else { return }
    inFlightChunkTasks.removeValue(forKey: task.taskIdentifier)
    _ = responseBuffers.removeValue(forKey: task.taskIdentifier)  // clear any buffered chunk response body
    let statusCode = (task.response as? HTTPURLResponse)?.statusCode

    if isStoppedByUser {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    // Rehydrate after a background relaunch: iOS restarted the app headless to deliver this
    // completion, so the singleton is fresh. Restore params from the resume record + last-persisted
    // offset, re-establish the window, and re-adopt the orphaned Live Activity so the upload continues
    // with no JS. Only when there's no current transfer (a different id is a stale straggler, dropped
    // below). If the record is missing (force-quit — iOS doesn't relaunch then), the JS reconcile on
    // next open handles it.
    if currentParams == nil,
      SqliteProgressWriter.readStatus(transferId: meta.transferId) == "active",
      let restored = TransferResumeStore.read(transferId: meta.transferId) {
      let savedOffset = SqliteProgressWriter.readUploadedChunks(transferId: meta.transferId)
      isStoppedByUser = false
      currentParams = restored
      lastNotifiedPercent = -1
      resetUploadWindow(startChunk: savedOffset, totalChunks: restored.totalChunks)
      TransferEventBus.activeTransferId = restored.transferId
      TransferActivityController.shared.start(transferId: restored.transferId, fileName: restored.fileName, type: "upload")
      NSLog("[BackgroundChunkTransfer] #rehydrate :: \(restored.transferId) from chunk \(savedOffset)")
    }

    guard let params = currentParams, params.transferId == meta.transferId else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    // A chunk cancelled with no user action = the OS tore down the background session (memory reclaim
    // or force-quit). Not a failure: requeue the chunk so the window re-uploads it (server chunk
    // writes are idempotent). A user pause sets isStoppedByUser and is handled above.
    if let error, (error as NSError).code == NSURLErrorCancelled {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      if case .chunk(let index) = meta.kind {
        requeueChunk(index)
        fillUploadWindow()
      }
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

    // Success — each chunk's temp file is deleted as soon as its upload is acknowledged.
    try? FileManager.default.removeItem(at: meta.tempFileUrl)

    // Only chunk tasks run on the background session (finalize is synchronous), so this is always a
    // chunk completion.
    if case .chunk(let index) = meta.kind {
      markChunkComplete(index, params: params)
    }
  }

  /// Mirrors executeAuthenticated's 401-then-retry-once — refreshes the token and re-uploads the SAME
  /// temp file (not yet deleted) rather than re-reading the chunk from source.
  private func handleUnauthorized(params: UploadParams, meta: TransferTaskMeta) {
    guard let newToken = try? TokenRefresher.refresh(session: URLSession(configuration: .ephemeral), baseUrl: params.baseUrl) else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      failTransfer(params, reason: "Token refresh failed after 401")
      return
    }
    // Update the cache so the rest of the in-flight window's chunks pick up the refreshed token.
    cachedAccessToken = newToken

    guard case .chunk(let index) = meta.kind else { return }
    let url = URL(string: "\(params.baseUrl)/api/v1/files/upload/chunk?uploadId=\(params.uploadId)&chunkIndex=\(index)")!

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")

    let retryTask = session.uploadTask(with: request, fromFile: meta.tempFileUrl)
    taskMeta[retryTask.taskIdentifier] = meta
    retryTask.taskDescription = meta.taskDescriptionValue
    inFlightChunkTasks[retryTask.taskIdentifier] = retryTask  // the retry rejoins the in-flight window
    retryTask.resume()
  }

  /// For a successful download, didFinishDownloadingTo already handled completion and removed this id
  /// from downloadTaskIds (error == nil), so this only has real work for a genuine failure. A
  /// user-initiated pause/cancel already wrote its terminal state, so isStoppedByUser here means
  /// "nothing more to do."
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
    // Must match the specific currentDownloadTask, not just any known download id — a task cancelled
    // via pause (then resumed under the same transferId) can deliver residual buffered didWriteData
    // calls briefly after being superseded; this identity check drops those stale calls.
    guard downloadTask === currentDownloadTask, let params = currentDownloadParams else { return }
    currentDownloadedBytes = totalBytesWritten
    currentTotalBytes = totalBytesExpectedToWrite
    guard totalBytesExpectedToWrite > 0 else { return }

    let progress = (Double(totalBytesWritten) * 100.0) / Double(totalBytesExpectedToWrite)
    if Int(progress) != lastNotifiedPercent {
      emitEvent(transferId: params.transferId, type: "download", status: "active", progress: progress)
      SqliteProgressWriter.updateProgress(transferId: params.transferId, progress: progress, uploadedChunks: 0)
      TransferActivityController.shared.update(progress: progress)
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
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "complete".
    SqliteProgressWriter.markComplete(transferId: params.transferId)
    currentDownloadParams = nil
    currentDownloadTask = nil
    TransferEventBus.activeTransferId = nil
    emitEvent(transferId: params.transferId, type: "download", status: "complete", progress: 100.0, localUri: params.destPath)
    // Notification first (no-ops while the Activity is up), then end the Activity on "Downloaded".
    showDownloadCompleteNotification(fileName: params.fileName)
    TransferActivityController.shared.end(state: "downloaded", progress: 100.0)
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

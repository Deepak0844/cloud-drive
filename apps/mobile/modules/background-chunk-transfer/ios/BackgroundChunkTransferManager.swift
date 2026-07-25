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

extension TransferTaskMeta {
  /// Stored on each task's `taskDescription` so the transfer id + chunk index survive a background
  /// relaunch (the in-memory taskMeta cache does not). Format: "<transferId>|chunk|<index>" or
  /// "<transferId>|finalize".
  var taskDescriptionValue: String {
    switch kind {
    case .chunk(let index): return "\(transferId)|chunk|\(index)"
    case .finalize: return "\(transferId)|finalize"
    }
  }

  /// Rebuilds the metadata from a relaunched task's `taskDescription`. The temp-file URL is
  /// re-derived from the deterministic names used when the task was created (chunk-<id>-<index>.bin
  /// / finalize-<id>.json); that temp file may already be gone, which is fine — the next chunk is
  /// read from the durable source file, not the temp.
  init?(taskDescription: String?) {
    guard let parts = taskDescription?.components(separatedBy: "|"), parts.count >= 2 else { return nil }
    let transferId = parts[0]
    let tmp = FileManager.default.temporaryDirectory
    switch parts[1] {
    case "chunk":
      guard parts.count == 3, let index = Int(parts[2]) else { return nil }
      self.init(
        transferId: transferId,
        kind: .chunk(index: index),
        tempFileUrl: tmp.appendingPathComponent("chunk-\(transferId)-\(index).bin")
      )
    case "finalize":
      self.init(
        transferId: transferId,
        kind: .finalize,
        tempFileUrl: tmp.appendingPathComponent("finalize-\(transferId).json")
      )
    default:
      return nil
    }
  }
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
  private var lastNotifiedPercent = -1

  // Windowed concurrent chunk upload. The engine keeps a window of chunk tasks in flight at once
  // instead of a strict one-at-a-time chain: when the app is suspended in the background, a full
  // window of tasks keeps uploading inside nsurlsessiond, so the transfer makes real progress
  // between iOS's infrequent background wake-ups instead of stalling. The server accepts chunks out
  // of order (uploadStatus returns a received-index array), so concurrency is safe; `contiguousCompleted`
  // (the longest 0..N all-received prefix) is the value used for resume, matching the server's offset.
  //
  // Window size is disk-aware (see computeWindowSize). When free space allows, the WHOLE file's
  // chunks are queued at once, so nsurlsessiond uploads it to completion while the app stays
  // suspended — smooth, no mid-file plateau, at any size. When storage is tight it falls back to a
  // sliding window (uploads correctly, with plateaus between iOS wake-ups). Peak scratch is bounded
  // by the budget below because each completed chunk's temp file is deleted immediately.
  //
  // Config knob: maxTempBudgetBytes caps how much scratch a single upload may queue (default 2 GB).
  private static let maxTempBudgetBytes: Int64 = 2 * 1024 * 1024 * 1024
  // Never queue temp files past this share of currently-free disk, so an upload can't fill the volume.
  private static let freeDiskUsableFraction = 0.4
  // Floor for the sliding window when disk is very constrained, so an upload still makes progress.
  private static let minWindowChunks = 6
  private var currentWindowSize = 1
  private var pendingChunkQueue: [Int] = []             // indices waiting to be scheduled (FIFO)
  private var inFlightChunkTasks: [Int: URLSessionTask] = [:]  // taskIdentifier -> chunk task
  private var completedChunkIndices: Set<Int> = []
  private var contiguousCompleted = 0
  private var isFinalizing = false
  // Access token read once per transfer and reused for its chunk + finalize tasks. A per-chunk
  // keychain read (SecureStoreReader) fails while the device is locked, which would stall a
  // backgrounded upload; caching avoids that. Refreshed on a 401, cleared on terminal states.
  private var cachedAccessToken: String?

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
    // Eagerly recreate the background URLSession on every launch — including a background relaunch
    // the OS triggers to deliver a terminated transfer's completed session events. The session is
    // otherwise created lazily on the first upload, so after a termination there would be no delegate
    // to receive the pending completion callbacks and the transfer would stall until the app was next
    // foregrounded. Reconnecting here lets didCompleteWithError fire, where the rehydrate path
    // continues the chunk chain with no JS involvement. (.shared is forced to init on every launch by
    // the AppDelegate config plugin, so this runs on every launch.)
    _ = self.session
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

  /// Whatever transfer currently owns the single tracking slot, regardless of kind — used by the
  /// busy guard below. Only one of currentParams/currentDownloadParams is ever non-nil at a time.
  private var activeTransferId: String? {
    currentParams?.transferId ?? currentDownloadParams?.transferId
  }

  func startUpload(_ params: UploadParams) {
    if let activeId = activeTransferId, activeId != params.transferId {
      emitEvent(transferId: params.transferId, type: "upload", status: "busy", progress: nil)
      return
    }
    isStoppedByUser = false
    currentParams = params
    lastNotifiedPercent = -1
    resetUploadWindow(startChunk: params.startChunk, totalChunks: params.totalChunks)
    // Read the token once now (foreground → keychain unlocked) and reuse it for every chunk/finalize
    // task; a fresh read replaces any stale token cached from a previous transfer.
    cachedAccessToken = SecureStoreReader.readValue(key: "access_token")
    TransferEventBus.activeTransferId = params.transferId
    // Persist the static params so a background relaunch after termination can rehydrate and finish
    // the upload headlessly (see didCompleteWithError's rehydrate branch).
    TransferResumeStore.write(params)
    emitEvent(transferId: params.transferId, type: "upload", status: "active", progress: initialProgress(params))
    // Live Activity is the progress surface while it exists.
    TransferActivityController.shared.start(fileName: params.fileName, type: "upload")
    TransferActivityController.shared.update(progress: initialProgress(params))
    if TransferActivityController.shared.isActive {
      // The Activity owns the surface — clear any progress notification orphaned by a prior process
      // (notifications survive app death just like the Activity), so the two don't both linger.
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

  /// Chooses how many chunk tasks to keep queued. The budget is the smaller of the configured cap
  /// (maxTempBudgetBytes) and a safe share of currently-free disk. If the whole file fits the budget
  /// it's all queued (nsurlsessiond uploads it to completion while suspended — smooth at any size);
  /// otherwise the largest window the budget allows, floored at minWindowChunks so a low-disk device
  /// still uploads (windowed, with plateaus).
  private func computeWindowSize(totalChunks: Int) -> Int {
    let budgetBytes = min(Self.maxTempBudgetBytes, Int64(Double(Self.availableDiskBytes()) * Self.freeDiskUsableFraction))
    let byBudget = Int(budgetBytes / Int64(Self.chunkSize))
    return min(max(1, totalChunks), max(Self.minWindowChunks, byBudget))
  }

  /// Free space on the volume backing the temp directory, in bytes. Uses the "important usage"
  /// capacity (what the OS will actually let the app use). Falls back to the configured budget if the
  /// value can't be read, so scheduling still proceeds.
  private static func availableDiskBytes() -> Int64 {
    if let values = try? FileManager.default.temporaryDirectory.resourceValues(
      forKeys: [.volumeAvailableCapacityForImportantUsageKey]
    ), let capacity = values.volumeAvailableCapacityForImportantUsage {
      return capacity
    }
    return maxTempBudgetBytes
  }

  /// Keeps up to currentWindowSize chunk tasks in flight, pulling from the pending queue. Called at
  /// start and after every chunk completion so the window stays full — this is what keeps
  /// nsurlsessiond uploading while the app is suspended.
  private func fillUploadWindow() {
    guard let params = currentParams, !isStoppedByUser, !isFinalizing else { return }
    while inFlightChunkTasks.count < currentWindowSize, !pendingChunkQueue.isEmpty {
      let index = pendingChunkQueue.removeFirst()
      uploadChunk(params, chunkIndex: index)
    }
  }

  /// Puts a chunk back at the front of the queue to be retried (used when a task was cancelled by an
  /// OS teardown rather than completing). No-op if it already completed or is already queued.
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
    // Drop it from the queue in case a rehydrate re-queued the whole range including a chunk that had
    // already completed while suspended — avoids re-uploading it.
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

  func startDownload(_ params: DownloadParams) {
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
    TransferActivityController.shared.start(fileName: params.fileName, type: "download")
    if TransferActivityController.shared.isActive {
      // See startUpload — the Activity is the surface; clear any orphaned progress notification.
      clearNotification()
    } else {
      showActiveDownloadNotification(params: params, progress: 0)
    }
    let resumeData = pausedResumeData.removeValue(forKey: params.transferId)
    beginDownloadTask(params: params, resumeData: resumeData)
  }

  func pause(transferId: String) {
    if currentParams?.transferId == transferId {
      // Once the last chunk lands, finalizeUpload posts the finalize request. Cancelling that
      // client-side doesn't undo it server-side — the server may have already created the file and
      // discarded uploadId by the time this cancel lands, leaving the row stuck "paused" with a
      // uploadId Resume's uploadStatus lookup 404s on. Finalize is a point of no return, so once it
      // has started just let it resolve to "complete"/"failed".
      guard !isFinalizing else { return }
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
    } else {
      // Not currently in flight — the transfer was already paused, which evicts it from
      // currentParams/currentDownloadParams (see stopActiveTransfer/pauseDownload). Stop still
      // needs to take effect for a paused row (both upload and download Stop buttons render
      // regardless of status), so mark it cancelled directly rather than silently no-op'ing.
      // Mirrors Android's handleStopSignal, which already marks cancelled unconditionally.
      let wasDownload = pausedResumeData.removeValue(forKey: transferId) != nil
      // SQLite write precedes the emit so a JS listener re-querying on the event sees "cancelled".
      SqliteProgressWriter.markCancelled(transferId: transferId)
      TransferResumeStore.remove(transferId: transferId)
      emitEvent(transferId: transferId, type: wasDownload ? "download" : "upload", status: "cancelled", progress: nil)
      // Already-paused rows had their Activity ended at pause time, so this is a safe no-op; kept
      // for symmetry with the in-flight cancel paths above.
      TransferActivityController.shared.end(state: "cancelled", progress: 0)
    }
  }

  /// Cancelling the in-flight chunk tasks triggers didCompleteWithError asynchronously for each, but
  /// isStoppedByUser is checked first there, so those only clean up the temp file and return without
  /// re-emitting or overwriting the status set here.
  private func stopActiveTransfer(transferId: String, status: String) {
    guard let params = currentParams, params.transferId == transferId else { return }
    isStoppedByUser = true
    let resumeOffset = contiguousCompleted
    cancelAllChunkTasks()

    // SQLite write precedes the emit so a JS listener re-querying on the event sees the final
    // status, not the still-"active" row it would otherwise race against.
    if status == "paused" {
      SqliteProgressWriter.markPaused(transferId: transferId)
    } else {
      SqliteProgressWriter.markCancelled(transferId: transferId)
    }
    // Remove the resume record on BOTH pause and cancel: the native interrupted-chunk requeue reads
    // this record, and a user-paused upload must not auto-resume from a straggler cancellation. A
    // later Resume (UI/notification) writes a fresh record at startUpload.
    TransferResumeStore.remove(transferId: transferId)

    emitEvent(transferId: transferId, type: "upload", status: status, progress: nil)
    currentParams = nil
    cachedAccessToken = nil
    TransferEventBus.activeTransferId = nil

    let pausedProgress = params.totalChunks > 0
      ? (Double(resumeOffset) * 100.0) / Double(params.totalChunks)
      : 0
    TransferActivityController.shared.end(state: status == "paused" ? "paused" : "cancelled", progress: pausedProgress)

    if status == "paused" {
      showPausedNotification(params.with(startChunk: resumeOffset))
    } else {
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
    // SQLite write precedes the emit so a JS listener re-querying on the event sees "paused".
    SqliteProgressWriter.markPaused(transferId: transferId)
    emitEvent(transferId: transferId, type: "download", status: "paused", progress: nil)
    currentDownloadParams = nil
    TransferEventBus.activeTransferId = nil
    let pausedProgress = currentTotalBytes > 0
      ? (Double(currentDownloadedBytes) * 100.0) / Double(currentTotalBytes)
      : 0
    TransferActivityController.shared.end(state: "paused", progress: pausedProgress)
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

  /// Returns the cached access token, reading the keychain once and caching it if not yet loaded
  /// (e.g. the first task after a background relaunch). Keeping it in memory means the per-chunk
  /// tasks don't each hit the keychain, which fails while the device is locked.
  private func accessToken() -> String? {
    if let cachedAccessToken { return cachedAccessToken }
    let token = SecureStoreReader.readValue(key: "access_token")
    cachedAccessToken = token
    return token
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

  private func finalizeUpload(_ params: UploadParams) {
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
    let meta = TransferTaskMeta(transferId: params.transferId, kind: .finalize, tempFileUrl: tempUrl)
    taskMeta[task.taskIdentifier] = meta
    task.taskDescription = meta.taskDescriptionValue
    task.resume()
  }

  // MARK: - Helpers

  private func failTransfer(_ params: UploadParams, reason: String) {
    NSLog("[BackgroundChunkTransfer] #uploadChunk :: transfer failed - \(params.transferId) - \(reason)")
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

  /// iOS does NOT replace an already-*delivered* (visible) notification just because a new
  /// request shares its identifier — that same-identifier replacement only applies to *pending*
  /// (not-yet-fired) requests. Since every notification here uses trigger: nil (immediate
  /// delivery), calling add() alone would stack a new visible notification on every update
  /// instead of updating in place. Explicitly clearing the old one first is what makes this
  /// behave like Android's mutable notify(id, ...).
  private func postNotification(_ content: UNMutableNotificationContent) {
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [Self.notificationIdentifier])
    center.removePendingNotificationRequests(withIdentifiers: [Self.notificationIdentifier])
    let request = UNNotificationRequest(identifier: Self.notificationIdentifier, content: content, trigger: nil)
    center.add(request)
  }

  /// Used only for the paused-state notification, which is commonly posted from within
  /// didReceive's Pause-action handling itself — replacing the same-identifier notification the
  /// user just tapped an action on, while iOS is still finishing its own handling of that tap,
  /// can silently drop the replacement. A short defer sidesteps that race. Progress-tick
  /// notifications don't use this: they fire far too often for a fixed delay to be safe (updates
  /// could arrive out of order and show stale progress).
  private func postNotificationDeferred(_ content: UNMutableNotificationContent) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
      self?.postNotification(content)
    }
  }

  private func showActiveNotification(params: UploadParams, progress: Int) {
    // While a Live Activity is live it is the progress surface — suppress the progress-tick
    // notification to avoid a double surface. Paused/complete notifications are unaffected (they
    // fire after the Activity has already been ended, and carry buttons the Activity lacks). If the
    // Activity never started (disabled / request failed), isActive is false and this runs as before.
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
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil
    postNotificationDeferred(content)
    lastNotifiedPercent = -1
  }

  private func showCompleteNotification(fileName: String) {
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
    let content = UNMutableNotificationContent()
    content.title = "Paused: \(params.fileName)"
    content.categoryIdentifier = Self.categoryPaused
    content.userInfo = params.asUserInfo
    content.sound = nil
    postNotificationDeferred(content)
    lastNotifiedPercent = -1
  }

  private func showDownloadCompleteNotification(fileName: String) {
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

  /// Lets the notification show while the app is in the foreground too — without this,
  /// foreground-delivered local notifications are suppressed by default. Progress-tick updates
  /// (categoryActive) only get the list entry, not a banner — otherwise every chunk/percent
  /// change would pop up and interrupt whatever the user is doing in the foreground. Paused,
  /// complete, and other one-off state changes still banner, since those are discrete events
  /// worth surfacing, not a continuous stream of ticks.
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
    let responseData = responseBuffers.removeValue(forKey: task.taskIdentifier)
    let statusCode = (task.response as? HTTPURLResponse)?.statusCode

    NSLog("[BackgroundChunkTransfer] #didComplete :: id=\(meta.transferId) kind=\(meta.kind) err=\((error as NSError?)?.code ?? 0) status=\(statusCode ?? -1) hasParams=\(currentParams != nil) stopped=\(isStoppedByUser) inflight=\(inFlightChunkTasks.count) pending=\(pendingChunkQueue.count)")

    if isStoppedByUser {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    // Rehydrate after a background relaunch: iOS restarted the app headless to deliver this
    // completion, so currentParams (and the whole singleton) is fresh. Restore the static params from
    // the durable resume record and the last-persisted contiguous offset from SQLite, re-establish the
    // window, and re-adopt the orphaned Live Activity — so the upload continues with no JS involvement.
    // Only done when there is no current transfer at all (a non-nil-but-different id is a stale
    // straggler, dropped by the guard below). If the record is missing (user force-quit — iOS does not
    // relaunch background sessions then), there is nothing to continue; the JS reconcile on the next
    // manual open handles it.
    if currentParams == nil, let restored = TransferResumeStore.read(transferId: meta.transferId) {
      let savedOffset = SqliteProgressWriter.readUploadedChunks(transferId: meta.transferId)
      isStoppedByUser = false
      currentParams = restored
      lastNotifiedPercent = -1
      resetUploadWindow(startChunk: savedOffset, totalChunks: restored.totalChunks)
      TransferEventBus.activeTransferId = restored.transferId
      TransferActivityController.shared.start(fileName: restored.fileName, type: "upload")
      NSLog("[BackgroundChunkTransfer] #rehydrate :: \(restored.transferId) from chunk \(savedOffset)")
    }

    guard let params = currentParams, params.transferId == meta.transferId else {
      try? FileManager.default.removeItem(at: meta.tempFileUrl)
      return
    }

    // A chunk task cancelled with no in-process user action = the OS tore the background session down
    // (memory reclaim or a user force-quit — iOS cancels background tasks in both). Not a failure:
    // requeue the chunk so the window re-uploads it (server chunk writes are idempotent). A user pause
    // sets isStoppedByUser and is handled above, so this never fires for a deliberate pause.
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

    switch meta.kind {
    case .chunk(let index):
      markChunkComplete(index, params: params)
    case .finalize:
      let cloudFileId = parseCloudFileId(from: responseData)
      // SQLite write precedes the emit so the JS listener's refreshNow, which fires on this event
      // and re-queries getByStatus(["active","pending","paused"]), sees the row as "complete" (and
      // thus gone) instead of racing a still-"active" read that leaves it stuck in the sheet.
      SqliteProgressWriter.markComplete(transferId: params.transferId)
      TransferResumeStore.remove(transferId: params.transferId)
      // When this finalize lands headless (background relaunch), JS never runs to delete the durable
      // documentDirectory upload copy it made at enqueue time, so it would orphan. Delete it here;
      // the JS path's own deleteAsync stays idempotent when JS is running.
      if let sourceUrl = localFileUrl(from: params.localUri) {
        try? FileManager.default.removeItem(at: sourceUrl)
      }
      emitEvent(transferId: params.transferId, type: "upload", status: "complete", progress: 100.0, cloudFileId: cloudFileId)
      currentParams = nil
      cachedAccessToken = nil
      TransferEventBus.activeTransferId = nil
      TransferActivityController.shared.end(state: "uploaded", progress: 100.0)
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
    // Update the cache so the rest of the in-flight window's chunks pick up the refreshed token.
    cachedAccessToken = newToken

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
    retryTask.taskDescription = meta.taskDescriptionValue
    // Chunk retries rejoin the in-flight window; the finalize retry is the single finalize task.
    if case .chunk = meta.kind {
      inFlightChunkTasks[retryTask.taskIdentifier] = retryTask
    }
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
    TransferActivityController.shared.end(state: "downloaded", progress: 100.0)
    emitEvent(transferId: params.transferId, type: "download", status: "complete", progress: 100.0, localUri: params.destPath)
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

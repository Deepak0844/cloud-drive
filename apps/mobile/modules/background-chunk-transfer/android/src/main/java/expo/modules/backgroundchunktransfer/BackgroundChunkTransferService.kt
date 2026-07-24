package expo.modules.backgroundchunktransfer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.util.concurrent.TimeUnit

class BackgroundChunkTransferService : Service() {
  private val job = Job()
  private val scope = CoroutineScope(Dispatchers.IO + job)
  private val httpClient = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(60, TimeUnit.SECONDS)
    .build()

  // Only one transfer runs at a time (serialized by design, see plan Architecture §3), so a
  // single instance-level slot for the active job is enough — pause/cancel Intents route to
  // this same running Service instance, not a fresh one, as long as it's still alive.
  private var currentTransferId: String? = null
    set(value) {
      field = value
      // Single source of truth kept in sync so the Module can answer "is this transfer already
      // running?" synchronously — see TransferEventBus.activeTransferId.
      TransferEventBus.activeTransferId = value
    }
  private var currentUploadJob: Job? = null
  private var currentParams: UploadParams? = null
  private var currentUploadedChunks: Int = 0
  // Only one of currentParams/currentDownloadParams is ever non-null at a time — the service
  // runs one transfer at a time regardless of kind (matching the architecture's single-slot
  // model). currentTransferId (below) is the kind-agnostic "what's active" source of truth.
  private var currentDownloadParams: DownloadParams? = null
  private var currentDownloadedBytes: Long = 0
  private var currentTotalBytes: Long = -1
  // uploadChunk/finalizeUpload use OkHttp's blocking execute() inside plain (non-suspend)
  // functions, which have no coroutine cancellation checkpoints — job.cancel() alone does NOT
  // interrupt an in-flight blocking call. The actual Call must be cancelled directly.
  private var currentCall: okhttp3.Call? = null
  // Distinguishes a deliberate pause/cancel from a genuine failure in runUpload's catch block —
  // cancelling currentCall surfaces as a plain IOException, not CancellationException, so a type
  // check alone isn't enough to avoid the markFailed() race.
  private var isStoppedByUser = false
  // finalizeUpload() reuses the same currentCall slot as chunk uploads (see executeAuthenticated).
  // Cancelling that call client-side doesn't undo it server-side — finalize may have already
  // created the file and consumed uploadId by the time the cancel lands, leaving the row stuck
  // "paused" with a uploadId Resume's uploadStatus lookup then 404s on. Mirrors iOS's
  // TransferTaskKind.isFinalize guard in pause(). Only guards pause, not cancel — cancel is a
  // terminal "discard" action with no later Resume to race.
  private var isFinalizingUpload = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_PAUSE -> {
        handleStopSignal(intent, startId, isCancel = false)
        return START_NOT_STICKY
      }
      ACTION_CANCEL -> {
        handleStopSignal(intent, startId, isCancel = true)
        return START_NOT_STICKY
      }
      ACTION_START_DOWNLOAD -> {
        val params = DownloadParams.fromIntent(intent)
        if (params == null) {
          stopSelf(startId)
          return START_NOT_STICKY
        }

        // Backstop only — BackgroundChunkTransferModule.startDownload already guards the common
        // case synchronously before ever calling startForegroundService. This only catches the
        // narrow race where two start calls both pass that check before either's onStartCommand
        // has set currentTransferId. Must still call startForeground (contractual requirement
        // for a service launched via startForegroundService), then leave the active job alone.
        if (currentTransferId != null && currentTransferId != params.transferId) {
          reassertForeground()
          emitEvent(params.transferId, "download", "busy", null)
          return START_NOT_STICKY
        }

        val notification = buildNotification("Downloading ${params.fileName}", 0, params.transferId)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
          startForeground(NOTIFICATION_ID, notification)
        }

        currentTransferId = params.transferId
        currentDownloadParams = params
        currentDownloadedBytes = 0
        currentTotalBytes = -1
        isStoppedByUser = false
        emitEvent(params.transferId, "download", "active", 0.0)
        currentUploadJob = scope.launch {
          runDownload(params)
          currentTransferId = null
          currentDownloadParams = null
          currentUploadJob = null
          stopForeground(STOP_FOREGROUND_REMOVE)
          stopSelf(startId)
        }

        return START_REDELIVER_INTENT
      }
    }

    val params = intent?.let { UploadParams.fromIntent(it) }
    if (params == null) {
      stopSelf(startId)
      return START_NOT_STICKY
    }

    // Backstop only — see the matching comment in the ACTION_START_DOWNLOAD branch above.
    if (currentTransferId != null && currentTransferId != params.transferId) {
      reassertForeground()
      emitEvent(params.transferId, "upload", "busy", null)
      return START_NOT_STICKY
    }

    val notification = buildNotification("Uploading ${params.fileName}", initialProgress(params), params.transferId)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    currentTransferId = params.transferId
    currentParams = params
    currentUploadedChunks = params.startChunk
    isStoppedByUser = false
    emitEvent(params.transferId, "upload", "active", initialProgress(params).toDouble())
    currentUploadJob = scope.launch {
      runUpload(params)
      currentTransferId = null
      currentParams = null
      currentUploadJob = null
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf(startId)
    }

    return START_REDELIVER_INTENT
  }

  /**
   * Re-satisfies the startForeground contract for a busy-rejected start call that reused this
   * already-foregrounded Service instance — rebuilds whatever notification the currently active
   * transfer already has showing, so a would-be-intruding start doesn't wipe or freeze it.
   */
  private fun reassertForeground() {
    val transferId = currentTransferId ?: return
    val title = when {
      currentParams != null -> "Uploading ${currentParams!!.fileName}"
      currentDownloadParams != null -> "Downloading ${currentDownloadParams!!.fileName}"
      else -> "Transfer in progress"
    }
    val progress = lastNotifiedPercent.coerceAtLeast(0)
    val notification = buildNotification(title, progress, transferId)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  /** Handles both notification-button taps and direct pause()/cancel() module calls. */
  private fun handleStopSignal(intent: Intent, startId: Int, isCancel: Boolean) {
    val transferId = intent.getStringExtra("transferId")
    val isActiveJob = transferId != null && transferId == currentTransferId
    val paramsAtSignalTime = currentParams
    val uploadedChunksAtSignalTime = currentUploadedChunks
    val downloadParamsAtSignalTime = currentDownloadParams
    val downloadedBytesAtSignalTime = currentDownloadedBytes
    val totalBytesAtSignalTime = currentTotalBytes
    val type = if (downloadParamsAtSignalTime != null) "download" else "upload"

    if (isActiveJob && !isCancel && isFinalizingUpload && currentParams != null) {
      // See isFinalizingUpload's declaration comment — finalize is a point of no return, so a
      // pause request that lands while it's in flight is ignored entirely rather than racing it.
      // currentParams != null scopes this to an active upload (a download sets
      // currentDownloadParams instead), so the guard can never touch a download's pause.
      return
    }

    if (isActiveJob) {
      isStoppedByUser = true
      currentCall?.cancel()
      currentUploadJob?.cancel()
      currentTransferId = null
      currentParams = null
      currentDownloadParams = null
      // Cancelling a call mid-write can leave its underlying connection in a broken state
      // inside OkHttp's connection pool; reusing that connection on a later resume/retry can
      // hang until readTimeout instead of failing fast. Evict so anything that follows opens a
      // fresh connection.
      httpClient.connectionPool.evictAll()
    }

    if (transferId != null) {
      if (isCancel) {
        SqliteProgressWriter.markCancelled(applicationContext, transferId)
        emitEvent(transferId, type, "cancelled", null)
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        SqliteProgressWriter.markPaused(applicationContext, transferId)
        emitEvent(transferId, type, "paused", null)
        if (isActiveJob && paramsAtSignalTime != null) {
          // Detach (not remove) so the notification survives pausing — with Resume/Stop actions
          // instead of Pause/Stop — since the whole point of pause is offering a way back in
          // from the notification itself, not just from in-app UI.
          stopForeground(STOP_FOREGROUND_DETACH)
          val resumeParams = paramsAtSignalTime.copy(startChunk = uploadedChunksAtSignalTime)
          notificationManager().notify(NOTIFICATION_ID, buildPausedNotification(resumeParams))
        } else if (isActiveJob && downloadParamsAtSignalTime != null) {
          stopForeground(STOP_FOREGROUND_DETACH)
          notificationManager().notify(
            NOTIFICATION_ID,
            buildDownloadPausedNotification(downloadParamsAtSignalTime, downloadedBytesAtSignalTime, totalBytesAtSignalTime)
          )
        } else {
          stopForeground(STOP_FOREGROUND_REMOVE)
        }
      }
    }

    if (!isActiveJob) {
      // This instance was only just created to deliver the signal (no matching live job) —
      // nothing else to run, so it can stop immediately.
      stopSelf(startId)
    }
  }

  override fun onDestroy() {
    job.cancel()
    super.onDestroy()
  }

  private fun initialProgress(params: UploadParams): Int =
    if (params.totalChunks > 0) (params.startChunk * 100) / params.totalChunks else 0

  private suspend fun runUpload(params: UploadParams) {
    isFinalizingUpload = false
    try {
      val file = RandomAccessFile(Uri.parse(params.localUri).path, "r")
      file.use { raf ->
        for (chunkIndex in params.startChunk until params.totalChunks) {
          val offset = chunkIndex.toLong() * CHUNK_SIZE
          val remaining = (raf.length() - offset).coerceAtMost(CHUNK_SIZE.toLong()).toInt()
          val buffer = ByteArray(remaining)
          raf.seek(offset)
          raf.readFully(buffer)

          uploadChunk(params, chunkIndex, buffer)

          val uploadedChunks = chunkIndex + 1
          currentUploadedChunks = uploadedChunks
          val progress = (uploadedChunks * 100.0) / params.totalChunks
          SqliteProgressWriter.updateProgress(applicationContext, params.transferId, progress, uploadedChunks)
          updateNotification("Uploading ${params.fileName}", progress.toInt(), params.transferId)
          emitEvent(params.transferId, "upload", "active", progress)
        }
      }

      isFinalizingUpload = true
      // Reset in a finally so isFinalizingUpload is true ONLY for the duration of the finalize
      // call itself — never left set after it returns or throws. Otherwise the flag stayed true
      // after the upload completed and poisoned the pause guard of the next transfer (including a
      // later download, since the guard didn't check job type), silently dropping its pause.
      val cloudFileId = try {
        finalizeUpload(params)
      } finally {
        isFinalizingUpload = false
      }
      SqliteProgressWriter.markComplete(applicationContext, params.transferId)
      showCompleteNotification("Uploaded ${params.fileName}")
      emitEvent(params.transferId, "upload", "complete", 100.0, cloudFileId = cloudFileId)
    } catch (ex: kotlinx.coroutines.CancellationException) {
      // Pause/cancel already wrote the correct terminal status in handleStopSignal() before
      // cancelling this job — must rethrow (not swallow) so structured concurrency completes
      // the coroutine as Cancelled, but must NOT run the markFailed() path below, which would
      // otherwise race and overwrite "paused"/"cancelled" with "failed".
      throw ex
    } catch (ex: Exception) {
      // Cancelling currentCall (handleStopSignal) surfaces here as a plain IOException, not
      // CancellationException, since it interrupts a blocking OkHttp call rather than a
      // coroutine suspension point — isStoppedByUser is what actually distinguishes a
      // deliberate pause/cancel (status already correctly written) from a genuine failure.
      if (!isStoppedByUser) {
        Log.e(TAG, "Upload failed for transfer ${params.transferId} at chunk $currentUploadedChunks/${params.totalChunks}", ex)
        SqliteProgressWriter.markFailed(applicationContext, params.transferId, params.retryCount + 1)
        dismissProgressNotification()
        emitEvent(params.transferId, "upload", "failed", null)
      }
    }
  }

  /**
   * Single-request streaming download with Range-header resume — no chunking needed since the
   * server's serveWithRange already supports HTTP Range requests at the protocol level. Resumes
   * from wherever the partial destination file on disk already reaches, mirroring how the
   * upload engine resumes from row.uploadedChunks: the file itself is the resume checkpoint,
   * no separate offset bookkeeping needed.
   */
  private suspend fun runDownload(params: DownloadParams) {
    try {
      // destPath arrives as a file:// URI, matching the same convention as localUri for
      // uploads (see runUpload's RandomAccessFile(Uri.parse(params.localUri).path, ...)).
      val destFile = File(Uri.parse(params.destPath).path!!)
      destFile.parentFile?.mkdirs()
      val resumeOffset = if (destFile.exists()) destFile.length() else 0L

      val response = executeAuthenticated(params.baseUrl) { token ->
        Request.Builder()
          .url(params.url)
          .addHeader("Authorization", "Bearer $token")
          .apply { if (resumeOffset > 0) addHeader("Range", "bytes=$resumeOffset-") }
          .build()
      }

      response.use { resp ->
        if (!resp.isSuccessful) {
          throw java.io.IOException("Download failed: HTTP ${resp.code}")
        }

        val body = resp.body ?: throw java.io.IOException("Download failed: empty body")
        val isPartial = resp.code == 206
        // If we asked for a Range but the server ignored it (e.g. a proxy stripped the header),
        // it returns a full 200 body — appending that to the existing partial file would
        // corrupt it, so start over instead.
        if (!isPartial && resumeOffset > 0) {
          destFile.delete()
        }
        val alreadyWritten = if (isPartial) resumeOffset else 0L
        val contentLength = body.contentLength()
        currentTotalBytes = if (contentLength >= 0) alreadyWritten + contentLength else -1
        currentDownloadedBytes = alreadyWritten

        var lastNotifiedPercent = -1
        java.io.FileOutputStream(destFile, isPartial && alreadyWritten > 0).use { out ->
          body.byteStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
              val read = input.read(buffer)
              if (read == -1) break
              out.write(buffer, 0, read)
              currentDownloadedBytes += read
              if (currentTotalBytes > 0) {
                val progress = (currentDownloadedBytes * 100.0) / currentTotalBytes
                SqliteProgressWriter.updateProgress(applicationContext, params.transferId, progress, 0)
                if (progress.toInt() != lastNotifiedPercent) {
                  lastNotifiedPercent = progress.toInt()
                  updateNotification("Downloading ${params.fileName}", progress.toInt(), params.transferId)
                  emitEvent(params.transferId, "download", "active", progress)
                }
              }
            }
          }
        }
      }

      SqliteProgressWriter.markComplete(applicationContext, params.transferId)
      showCompleteNotification("Downloaded ${params.fileName}")
      emitEvent(params.transferId, "download", "complete", 100.0, localUriResult = params.destPath)
    } catch (ex: kotlinx.coroutines.CancellationException) {
      throw ex
    } catch (ex: Exception) {
      if (!isStoppedByUser) {
        Log.e(TAG, "Download failed for transfer ${params.transferId}", ex)
        SqliteProgressWriter.markFailed(applicationContext, params.transferId, 0)
        dismissProgressNotification()
        emitEvent(params.transferId, "download", "failed", null)
      }
    }
  }

  private fun emitEvent(
    transferId: String,
    type: String,
    status: String,
    progress: Double?,
    cloudFileId: String? = null,
    localUriResult: String? = null
  ) {
    TransferEventBus.emit(
      mapOf(
        "transferId" to transferId,
        "type" to type,
        "status" to status,
        "progress" to progress,
        "cloudFileId" to cloudFileId,
        "localUri" to localUriResult
      )
    )
  }

  private fun currentAccessToken(): String {
    return SecureStoreReader.readValue(applicationContext, "access_token")
      ?: throw IllegalStateException("No access token available")
  }

  /**
   * Executes an authenticated request, refreshing the access token and retrying exactly once on
   * a 401 — mirrors customBaseQuery.js's silent-refresh behavior, but native code can't rely on
   * JS being alive to do it, so it owns the refresh itself.
   */
  private fun executeAuthenticated(baseUrl: String, buildRequest: (token: String) -> Request): okhttp3.Response {
    val firstCall = httpClient.newCall(buildRequest(currentAccessToken()))
    currentCall = firstCall
    val firstResponse = firstCall.execute()
    if (firstResponse.code != 401) {
      return firstResponse
    }
    firstResponse.close()

    val refreshedToken = TokenRefresher.refresh(applicationContext, httpClient, baseUrl)
    val retryCall = httpClient.newCall(buildRequest(refreshedToken))
    currentCall = retryCall
    return retryCall.execute()
  }

  private fun uploadChunk(params: UploadParams, chunkIndex: Int, bytes: ByteArray) {
    val url = "${params.baseUrl}/api/v1/files/upload/chunk?uploadId=${params.uploadId}&chunkIndex=$chunkIndex"

    executeAuthenticated(params.baseUrl) { token ->
      Request.Builder()
        .url(url)
        .addHeader("Authorization", "Bearer $token")
        .post(bytes.toRequestBody("application/octet-stream".toMediaType()))
        .build()
    }.use { response ->
      if (!response.isSuccessful) {
        throw java.io.IOException("Chunk upload failed: HTTP ${response.code}")
      }
    }
  }

  private fun finalizeUpload(params: UploadParams): String? {
    val body = JSONObject().apply {
      put("uploadId", params.uploadId)
      put("fileName", params.fileName)
      put("folderId", params.folderId)
      put("mimeType", params.mimeType)
      put("totalSize", RandomAccessFile(Uri.parse(params.localUri).path, "r").use { it.length() })
    }

    executeAuthenticated(params.baseUrl) { token ->
      Request.Builder()
        .url("${params.baseUrl}/api/v1/files/upload/finalize")
        .addHeader("Authorization", "Bearer $token")
        .post(body.toString().toRequestBody("application/json".toMediaType()))
        .build()
    }.use { response ->
      if (!response.isSuccessful) {
        throw java.io.IOException("Finalize failed: HTTP ${response.code}")
      }
      val responseBody = JSONObject(response.body?.string() ?: "{}")
      val data = responseBody.optJSONObject("data") ?: return null
      val id = data.optString("_id").ifEmpty { data.optString("id") }
      return id.ifEmpty { null }
    }
  }

  // ─── Notification (silent, low-importance, in-place updates only) ─────────────

  private fun notificationManager() = getSystemService(NotificationManager::class.java)

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Transfers", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null)
        enableVibration(false)
      }
      notificationManager().createNotificationChannel(channel)
    }
  }

  private fun actionPendingIntent(action: String, transferId: String): PendingIntent {
    val intent = Intent(this, BackgroundChunkTransferService::class.java).apply {
      this.action = action
      putExtra("transferId", transferId)
    }
    val requestCode = (action + transferId).hashCode()
    return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** Resume is just a plain start (no special action) carrying the params to continue from. */
  private fun resumePendingIntent(resumeParams: UploadParams): PendingIntent {
    val intent = Intent(this, BackgroundChunkTransferService::class.java).apply {
      putExtra("transferId", resumeParams.transferId)
      putExtra("localUri", resumeParams.localUri)
      putExtra("fileName", resumeParams.fileName)
      putExtra("mimeType", resumeParams.mimeType)
      putExtra("folderId", resumeParams.folderId)
      putExtra("baseUrl", resumeParams.baseUrl)
      putExtra("uploadId", resumeParams.uploadId)
      putExtra("totalChunks", resumeParams.totalChunks)
      putExtra("startChunk", resumeParams.startChunk)
      putExtra("retryCount", resumeParams.retryCount)
    }
    val requestCode = ("resume" + resumeParams.transferId).hashCode()
    return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun buildPausedNotification(resumeParams: UploadParams): Notification {
    ensureChannel()
    val progress = if (resumeParams.totalChunks > 0) (resumeParams.startChunk * 100) / resumeParams.totalChunks else 0
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Paused: ${resumeParams.fileName}")
      .setSmallIcon(android.R.drawable.stat_sys_upload)
      .setOngoing(false)
      .setOnlyAlertOnce(true)
      .setProgress(100, progress, false)
      .addAction(0, "Resume", resumePendingIntent(resumeParams))
      .addAction(0, "Stop", actionPendingIntent(ACTION_CANCEL, resumeParams.transferId))
      .build()
  }

  /**
   * Resume just re-issues ACTION_START_DOWNLOAD — no byte offset needs to be passed since
   * runDownload() re-derives it from however much the destination file already has on disk.
   */
  private fun resumeDownloadPendingIntent(params: DownloadParams): PendingIntent {
    val intent = Intent(this, BackgroundChunkTransferService::class.java).apply {
      action = ACTION_START_DOWNLOAD
      putExtra("transferId", params.transferId)
      putExtra("fileId", params.fileId)
      putExtra("url", params.url)
      putExtra("destPath", params.destPath)
      putExtra("fileName", params.fileName)
      putExtra("baseUrl", params.baseUrl)
    }
    val requestCode = ("resumeDownload" + params.transferId).hashCode()
    return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun buildDownloadPausedNotification(params: DownloadParams, downloadedBytes: Long, totalBytes: Long): Notification {
    ensureChannel()
    val progress = if (totalBytes > 0) ((downloadedBytes * 100) / totalBytes).toInt() else 0
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Paused: ${params.fileName}")
      .setSmallIcon(android.R.drawable.stat_sys_download)
      .setOngoing(false)
      .setOnlyAlertOnce(true)
      .setProgress(100, progress, false)
      .addAction(0, "Resume", resumeDownloadPendingIntent(params))
      .addAction(0, "Stop", actionPendingIntent(ACTION_CANCEL, params.transferId))
      .build()
  }

  private fun buildNotification(title: String, progress: Int, transferId: String): Notification {
    ensureChannel()
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setSmallIcon(android.R.drawable.stat_sys_upload)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setProgress(100, progress, false)
      .addAction(0, "Pause", actionPendingIntent(ACTION_PAUSE, transferId))
      .addAction(0, "Stop", actionPendingIntent(ACTION_CANCEL, transferId))
      .build()
  }

  private var lastNotifiedPercent = -1

  private fun updateNotification(title: String, progress: Int, transferId: String) {
    if (progress == lastNotifiedPercent) return
    lastNotifiedPercent = progress
    notificationManager().notify(NOTIFICATION_ID, buildNotification(title, progress, transferId))
  }

  private fun dismissProgressNotification() {
    notificationManager().cancel(NOTIFICATION_ID)
  }

  private fun showCompleteNotification(title: String) {
    ensureChannel()
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText("Tap to open")
      .setSmallIcon(android.R.drawable.stat_sys_upload_done)
      .setAutoCancel(true)
      .build()
    notificationManager().notify(NOTIFICATION_ID, notification)
  }

  companion object {
    private const val TAG = "BackgroundChunkTransfer"
    private const val CHANNEL_ID = "transfer_progress"
    private const val NOTIFICATION_ID = 4201
    private const val CHUNK_SIZE = 5 * 1024 * 1024
    const val ACTION_PAUSE = "expo.modules.backgroundchunktransfer.action.PAUSE"
    const val ACTION_CANCEL = "expo.modules.backgroundchunktransfer.action.CANCEL"
    const val ACTION_START_DOWNLOAD = "expo.modules.backgroundchunktransfer.action.START_DOWNLOAD"
  }
}

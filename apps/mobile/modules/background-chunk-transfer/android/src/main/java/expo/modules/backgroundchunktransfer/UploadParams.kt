package expo.modules.backgroundchunktransfer

import android.content.Intent

data class UploadParams(
  val transferId: String,
  val localUri: String,
  val fileName: String,
  val mimeType: String,
  val folderId: String?,
  val baseUrl: String,
  val uploadId: String,
  val totalChunks: Int,
  val startChunk: Int,
  val retryCount: Int
) {
  companion object {
    fun fromIntent(intent: Intent): UploadParams? {
      val transferId = intent.getStringExtra("transferId") ?: return null
      val localUri = intent.getStringExtra("localUri") ?: return null
      val fileName = intent.getStringExtra("fileName") ?: return null
      val mimeType = intent.getStringExtra("mimeType") ?: return null
      val baseUrl = intent.getStringExtra("baseUrl") ?: return null
      val uploadId = intent.getStringExtra("uploadId") ?: return null
      val totalChunks = intent.getIntExtra("totalChunks", -1)
      if (totalChunks <= 0) return null

      return UploadParams(
        transferId = transferId,
        localUri = localUri,
        fileName = fileName,
        mimeType = mimeType,
        folderId = intent.getStringExtra("folderId"),
        baseUrl = baseUrl,
        uploadId = uploadId,
        totalChunks = totalChunks,
        startChunk = intent.getIntExtra("startChunk", 0),
        retryCount = intent.getIntExtra("retryCount", 0)
      )
    }
  }
}

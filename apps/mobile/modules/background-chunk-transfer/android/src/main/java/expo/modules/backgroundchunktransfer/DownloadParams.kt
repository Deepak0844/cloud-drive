package expo.modules.backgroundchunktransfer

import android.content.Intent

data class DownloadParams(
  val transferId: String,
  val fileId: String,
  val url: String,
  val destPath: String,
  val fileName: String,
  val baseUrl: String
) {
  companion object {
    fun fromIntent(intent: Intent): DownloadParams? {
      val transferId = intent.getStringExtra("transferId") ?: return null
      val fileId = intent.getStringExtra("fileId") ?: return null
      val url = intent.getStringExtra("url") ?: return null
      val destPath = intent.getStringExtra("destPath") ?: return null
      val fileName = intent.getStringExtra("fileName") ?: return null
      val baseUrl = intent.getStringExtra("baseUrl") ?: return null

      return DownloadParams(
        transferId = transferId,
        fileId = fileId,
        url = url,
        destPath = destPath,
        fileName = fileName,
        baseUrl = baseUrl
      )
    }
  }
}

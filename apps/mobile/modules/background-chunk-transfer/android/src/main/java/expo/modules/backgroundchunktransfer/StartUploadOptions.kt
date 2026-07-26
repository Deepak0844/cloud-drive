package expo.modules.backgroundchunktransfer

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.Serializable

class StartUploadOptions(
  @Field var transferId: String = "",
  @Field var localUri: String = "",
  @Field var fileName: String = "",
  @Field var mimeType: String = "",
  @Field var folderId: String? = null,
  @Field var baseUrl: String = "",
  @Field var uploadId: String = "",
  @Field var totalChunks: Int = 0,
  @Field var startChunk: Int = 0,
  @Field var retryCount: Int = 0
) : Record, Serializable

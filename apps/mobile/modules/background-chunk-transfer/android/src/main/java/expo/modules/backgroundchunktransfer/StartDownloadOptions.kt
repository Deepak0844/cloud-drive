package expo.modules.backgroundchunktransfer

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.Serializable

class StartDownloadOptions(
  @Field var transferId: String = "",
  @Field var fileId: String = "",
  @Field var url: String = "",
  @Field var destPath: String = "",
  @Field var fileName: String = "",
  @Field var baseUrl: String = ""
) : Record, Serializable

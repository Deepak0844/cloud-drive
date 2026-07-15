import ExpoModulesCore

/// Mirrors StartUploadOptions.kt field-for-field so the JS bridge's startUpload() payload is
/// identical on both platforms.
struct StartUploadOptions: Record {
  @Field
  var transferId: String = ""
  @Field
  var localUri: String = ""
  @Field
  var fileName: String = ""
  @Field
  var mimeType: String = ""
  @Field
  var folderId: String? = nil
  @Field
  var baseUrl: String = ""
  @Field
  var uploadId: String = ""
  @Field
  var totalChunks: Int = 0
  @Field
  var startChunk: Int = 0
  @Field
  var retryCount: Int = 0
}

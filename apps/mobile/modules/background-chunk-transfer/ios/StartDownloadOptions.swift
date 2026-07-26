import ExpoModulesCore

/// Mirrors StartDownloadOptions.kt field-for-field.
struct StartDownloadOptions: Record {
  @Field
  var transferId: String = ""
  @Field
  var fileId: String = ""
  @Field
  var url: String = ""
  @Field
  var destPath: String = ""
  @Field
  var fileName: String = ""
  @Field
  var baseUrl: String = ""
}

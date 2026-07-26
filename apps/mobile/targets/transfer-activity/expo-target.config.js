/* global module */
/**
 * @bacons/apple-targets declaration for the Live Activity widget extension.
 *
 * The extension target cannot live directly in the CNG-generated `ios/` project — `expo prebuild
 * --clean` would wipe it. This config plugin regenerates the target into the Xcode project on every
 * prebuild (same survival model as the local module + AppDelegate plugin). All `*.swift` files in
 * this directory are compiled into the widget extension; `../../modules/.../ios/*` stays in the app
 * target. `NSSupportsLiveActivities` is set on the APP target's Info.plist via app.json, not here.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: "widget",
  name: "TransferActivity",
  // Must be >= 16.1 (ActivityKit) and match the app/module deployment target (16.4).
  deploymentTarget: "16.4",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit", "AppIntents"],
};

const { withAppDelegate } = require("@expo/config-plugins");

const IMPORT_MARKER = "import ReactAppDependencyProvider";
// Swift 6 requires a matching explicit access level across all imports of the same module in a
// file once any import in that file declares one — AppDelegate.swift's "internal import Expo"
// forces every other import here to declare its access level too, or the build fails with
// "ambiguous implicit access level".
const IMPORT_LINE = "internal import BackgroundChunkTransfer";

const LAUNCH_MARKER = "    let delegate = ReactNativeDelegate()";
const LAUNCH_TOUCH = `    // Force BackgroundChunkTransferManager's singleton to initialize on every app launch
    // (including a cold launch triggered by tapping a notification action), not just whenever
    // the first upload starts — its init registers UNNotificationCategories and sets the
    // UNUserNotificationCenter delegate, both of which must be in place before any notification
    // action tap can be serviced.
    _ = BackgroundChunkTransferManager.shared

${LAUNCH_MARKER}`;

const MARKER = "  // Universal Links";

const HANDLER = `  // Background URLSession relaunch handoff (background-chunk-transfer) — the OS calls
  // this to wake/relaunch the app when a background upload's session events are ready to be
  // delivered, even if the app isn't running.
  public override func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    if identifier == BackgroundChunkTransferManager.sessionIdentifier {
      BackgroundChunkTransferManager.shared.setBackgroundCompletionHandler(completionHandler)
    } else {
      completionHandler()
    }
  }

${MARKER}`;

function insertImport(contents) {
  if (contents.includes(IMPORT_LINE)) {
    return contents;
  }
  if (!contents.includes(IMPORT_MARKER)) {
    throw new Error(
      "background-chunk-transfer app.plugin.js: could not find the expected import anchor in " +
        "AppDelegate.swift (Expo's generated AppDelegate template may have changed) — update the " +
        "plugin's IMPORT_MARKER string."
    );
  }
  return contents.replace(IMPORT_MARKER, `${IMPORT_MARKER}\n${IMPORT_LINE}`);
}

function insertLaunchTouch(contents) {
  if (contents.includes("_ = BackgroundChunkTransferManager.shared")) {
    return contents;
  }
  if (!contents.includes(LAUNCH_MARKER)) {
    throw new Error(
      "background-chunk-transfer app.plugin.js: could not find the expected didFinishLaunching " +
        "anchor in AppDelegate.swift (Expo's generated AppDelegate template may have changed) — " +
        "update the plugin's LAUNCH_MARKER string."
    );
  }
  return contents.replace(LAUNCH_MARKER, LAUNCH_TOUCH);
}

function insertBackgroundSessionHandler(contents) {
  if (contents.includes("handleEventsForBackgroundURLSession")) {
    return contents;
  }
  if (!contents.includes(MARKER)) {
    throw new Error(
      "background-chunk-transfer app.plugin.js: could not find the expected anchor in AppDelegate.swift " +
        "(Expo's generated AppDelegate template may have changed) — update the plugin's MARKER string."
    );
  }
  return contents.replace(MARKER, HANDLER);
}

const withBackgroundChunkTransferAppDelegate = (config) =>
  withAppDelegate(config, (config) => {
    config.modResults.contents = insertImport(config.modResults.contents);
    config.modResults.contents = insertLaunchTouch(config.modResults.contents);
    config.modResults.contents = insertBackgroundSessionHandler(config.modResults.contents);
    return config;
  });

module.exports = withBackgroundChunkTransferAppDelegate;

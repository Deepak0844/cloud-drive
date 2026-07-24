/**
 * Build-time fallback switch between the native transfer engine and the legacy JS chunk-loop
 * path (backgroundTransfer.js's iOS-legacy branch, kept dormant since Phase 6). Flip to false
 * and rebuild to fall back if the native engine has a critical bug post-release — this is the
 * fallback-switch mechanism the original plan flagged as an open sub-decision before Phase 7
 * can remove the legacy path. No remote-config infrastructure exists in this project, and
 * building one for a single boolean is out of scope; a build flag plus a store release is an
 * acceptable rollback path here. Replace with a real remote-config read if that infrastructure
 * ever exists.
 */
export const USE_NATIVE_TRANSFER = true;

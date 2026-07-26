/**
 * Build-time fallback switch between the native transfer engine and the legacy JS chunk-loop path
 * (backgroundTransfer.js's iOS-legacy branch, kept dormant). Flip to false and rebuild if the native
 * engine has a critical bug post-release. No remote-config infrastructure exists here, so a build
 * flag plus a store release is the acceptable rollback path; replace if that infra ever exists.
 */
export const USE_NATIVE_TRANSFER = true;

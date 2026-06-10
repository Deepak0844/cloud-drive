// React core & third-party libraries
import PropTypes from "prop-types";
import { isHLSProvider, MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";

// Styles
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

/**
 * VideoPlayer
 *
 * Renders a Vidstack MediaPlayer with intelligent playback strategy:
 *   - Native formats (MP4, WebM, M4V): served directly via HTTP Range, browser handles everything
 *   - Non-native formats (MKV, AVI, MOV, etc.): loaded via HLS (hls.js — auto-loaded by Vidstack)
 *
 * Vidstack provides a production-ready UI with seeking, volume, fullscreen, PiP,
 * keyboard shortcuts, and automatic HLS support via the bundled hls.js provider.
 *
 * @param {{ playbackInfo: object, onError: function }} props
 */
export default function VideoPlayer({ playbackInfo, onError }) {
  if (!playbackInfo) return null;

  const { playbackUrl, mimeType, nativePlayback } = playbackInfo;

  // Vidstack accepts either a typed src object or a plain URL string.
  // For HLS we pass the explicit MIME type so Vidstack picks the HLS provider.
  const src = nativePlayback
    ? { src: playbackUrl, type: mimeType }
    : { src: playbackUrl, type: "application/x-mpegURL" };

  function onProviderChange(provider) {
    if (isHLSProvider(provider)) {
      provider.config = {
        // Tolerate small PTS gaps caused by AAC encoder delay in Vorbis→AAC transcoding
        maxBufferHole: 0.5,
        // The first segment request triggers an on-the-fly transcode; the server sends no
        // bytes until that segment is cached. hls.js defaults to a 10s time-to-first-byte
        // budget, which aborts seg-0 before a slow transcode finishes. Widen it to match the
        // server's 120s segment poll window (getHlsSegment POLL_TIMEOUT_MS). The full default
        // object is required: hls.js mergeConfig shallow-replaces fragLoadPolicy, so omitting
        // the retry sub-objects would leave them undefined.
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 120_000,
            maxLoadTimeMs: 240_000,
            timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
          },
        },
      };
    }
  }

  return (
    <MediaPlayer
      src={src}
      playsInline
      autoPlay
      className="w-full"
      style={{ "--video-border-radius": "1rem" }}
      onProviderChange={onProviderChange}
      onError={onError}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}

VideoPlayer.propTypes = {
  playbackInfo: PropTypes.object,
  onError: PropTypes.func,
};

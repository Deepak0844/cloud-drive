// React core & third-party libraries
import { useCallback, useMemo } from "react";
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
  // Hooks run before the early return (rules of hooks). Memoizing src + onProviderChange keeps
  // their identity stable across parent re-renders so Vidstack never re-initializes the provider
  // mid-playback — referential stability for a reactive prop, not a performance optimization.
  const playbackUrl = playbackInfo?.playbackUrl;
  const mimeType = playbackInfo?.mimeType;
  const nativePlayback = playbackInfo?.nativePlayback;

  // Vidstack accepts either a typed src object or a plain URL string.
  // For HLS we pass the explicit MIME type so Vidstack picks the HLS provider.
  const src = useMemo(
    () => (nativePlayback ? { src: playbackUrl, type: mimeType } : { src: playbackUrl, type: "application/x-mpegURL" }),
    [playbackUrl, mimeType, nativePlayback]
  );

  const onProviderChange = useCallback((provider) => {
    if (isHLSProvider(provider)) {
      provider.config = {
        // Tolerate small PTS gaps caused by AAC encoder delay in Vorbis→AAC transcoding
        maxBufferHole: 0.5,
        // Segments are produced on demand by an anchored transcode session. The server resolves
        // each request quickly — a cached hit, or a 503 + Retry-After once its SEGMENT_WAIT_MS
        // budget elapses while the session warms up. Keep a generous time budget for the
        // cold-start segment, and a generous errorRetry so transient 503s are re-requested (the
        // session keeps producing, so a retry lands a now-cached segment). The full default
        // object is required: hls.js mergeConfig shallow-replaces fragLoadPolicy, so omitting the
        // retry sub-objects would leave them undefined.
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 30_000,
            maxLoadTimeMs: 60_000,
            timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry: { maxNumRetry: 3, retryDelayMs: 2000, maxRetryDelayMs: 8000 },
          },
        },
      };
    }
  }, []);

  if (!playbackInfo) return null;

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

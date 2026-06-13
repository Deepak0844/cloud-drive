// React core & third-party libraries
import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { isHLSProvider, MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultAudioLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Styles
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

/**
 * AudioPlayer
 *
 * Renders a Vidstack MediaPlayer in audio mode with:
 *   - Album art (from thumbnail endpoint)
 *   - Track metadata (title / artist / album)
 *   - Full Vidstack audio controls (seek, volume, playback rate, etc.)
 *   - HLS fallback for non-native formats (WMA, AIFF, etc.) via Vidstack's built-in hls.js provider
 *
 * @param {{ playbackInfo: object, audioMetadata: object|null, fileId: string, onError: function }} props
 */
export default function AudioPlayer({ playbackInfo, audioMetadata = null, fileId, onError }) {
  const thumbnailUrl = fileId ? UrlUtils.format(`${ApiBasePath}${FileServiceUrls.thumbnail}`, { id: fileId }) : null;

  // Hooks run before the early return (rules of hooks). Memoizing src + onProviderChange keeps
  // their identity stable across parent re-renders so Vidstack never re-initializes the provider
  // mid-playback — referential stability for a reactive prop, not a performance optimization.
  const playbackUrl = playbackInfo?.playbackUrl;
  const mimeType = playbackInfo?.mimeType;
  const nativePlayback = playbackInfo?.nativePlayback;

  const src = useMemo(
    () =>
      nativePlayback
        ? { src: playbackUrl, type: mimeType }
        : { src: playbackUrl, type: "application/x-mpegURL" },
    [playbackUrl, mimeType, nativePlayback]
  );

  const onProviderChange = useCallback((provider) => {
    if (isHLSProvider(provider)) {
      provider.config = {
        // Tolerate small PTS gaps from encoder delay during source→AAC transcoding
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
            errorRetry: { maxNumRetry: 8, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
          },
        },
      };
    }
  }, []);

  if (!playbackInfo) return null;

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-surface-dim rounded-2xl w-[50%]">
      {/* Album art */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={audioMetadata?.album || "Album art"}
          className="w-40 h-40 rounded-2xl object-cover shadow-lg"
          onError={(e) => {
            // Hide broken album art gracefully
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-40 h-40 bg-primary/10 rounded-2xl flex items-center justify-center">
          <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      )}

      {/* Track metadata */}
      {audioMetadata && (audioMetadata.title || audioMetadata.artist || audioMetadata.album) && (
        <div className="text-center space-y-1 max-w-xs">
          {audioMetadata.title && <p className="font-semibold text-label text-base truncate">{audioMetadata.title}</p>}
          {audioMetadata.artist && <p className="text-label-secondary text-sm truncate">{audioMetadata.artist}</p>}
          {audioMetadata.album && <p className="text-label-tertiary text-xs truncate">{audioMetadata.album}</p>}
        </div>
      )}

      {/* Vidstack audio player */}
      <MediaPlayer src={src} viewType="audio" autoPlay className="w-full" onProviderChange={onProviderChange} onError={onError}>
        <MediaProvider />
        <DefaultAudioLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}

AudioPlayer.propTypes = {
  playbackInfo: PropTypes.object,
  audioMetadata: PropTypes.object,
  fileId: PropTypes.string,
  onError: PropTypes.func,
};

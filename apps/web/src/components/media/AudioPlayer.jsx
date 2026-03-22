// React core & third-party libraries
import { MediaPlayer, MediaProvider } from "@vidstack/react";
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
export default function AudioPlayer({ playbackInfo, audioMetadata, fileId, onError }) {
  const thumbnailUrl = fileId ? UrlUtils.format(`${ApiBasePath}${FileServiceUrls.thumbnail}`, { id: fileId }) : null;

  if (!playbackInfo) return null;

  const { playbackUrl, mimeType, nativePlayback } = playbackInfo;

  const src = nativePlayback
    ? { src: playbackUrl, type: mimeType }
    : { src: playbackUrl, type: "application/x-mpegURL" };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-surface-dim rounded-2xl w-full">
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
      <MediaPlayer src={src} autoPlay className="w-full" onError={onError}>
        <MediaProvider />
        <DefaultAudioLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}

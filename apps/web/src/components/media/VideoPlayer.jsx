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
      // Tolerate small PTS gaps caused by AAC encoder delay in Vorbis→AAC transcoding
      provider.config = { maxBufferHole: 0.5 };
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

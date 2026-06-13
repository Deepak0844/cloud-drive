import { useEffect } from "react";

const BASE_TITLE = "Cloud Drive - Modern NAS Experience";
const FAVICON_PATH = "/logo.png";

function formatCount(count) {
  return count > 9 ? "9+" : String(count);
}

function applyFaviconBadge(count, isCancelled) {
  const link = document.querySelector("link[rel~='icon']");
  if (!link) return;

  // Reset directly when no unread — no canvas needed
  if (count === 0) {
    link.href = FAVICON_PATH;
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.onload = () => {
    // Guard against writing after the effect has been cleaned up (unmount race)
    if (isCancelled()) return;

    ctx.drawImage(img, 0, 0, 32, 32);

    ctx.beginPath();
    ctx.arc(24, 8, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.font = "bold 10px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatCount(count), 24, 8);

    link.type = "image/png";
    link.href = canvas.toDataURL("image/png");
  };
  img.src = FAVICON_PATH;
}

export default function useTabNotification(unreadCount) {
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${formatCount(unreadCount)}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [unreadCount]);

  useEffect(() => {
    let cancelled = false;
    applyFaviconBadge(unreadCount, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [unreadCount]);

  // Restore title and favicon to defaults on unmount (logout)
  useEffect(() => {
    return () => {
      document.title = BASE_TITLE;
      const link = document.querySelector("link[rel~='icon']");
      if (link) link.href = FAVICON_PATH;
    };
  }, []);
}

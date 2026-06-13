import axios from "axios";

import { ApiBasePath, CsrfServiceUrls } from "@constants/serviceUrls";

export const CSRF_HEADER = "x-csrf-token";

export function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Dedupes concurrent fetches with a module-level promise (mirrors refreshPromise in axiosInterceptors).
let fetchPromise = null;

export async function ensureCsrfToken() {
  const existing = readCsrfCookie();
  if (existing) {
    return existing;
  }
  if (!fetchPromise) {
    fetchPromise = axios
      .get(`${ApiBasePath}${CsrfServiceUrls.getToken}`, { withCredentials: true })
      .finally(() => {
        fetchPromise = null;
      });
  }
  await fetchPromise;
  return readCsrfCookie();
}

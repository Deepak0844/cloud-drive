import axios from "axios";
import { ApiBasePath } from "@constants/serviceUrls";

const REFRESH_URL = `${ApiBasePath}/auth/refresh`;

let refreshPromise = null;

export function setupAxiosInterceptors() {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Skip if: not a 401, already retried, or the failing request IS the refresh call
      // (last guard breaks the infinite loop: refresh→401→try-to-refresh→401→...)
      if (
        error.response?.status !== 401 ||
        originalRequest._isRetry ||
        originalRequest.url === REFRESH_URL
      ) {
        return Promise.reject(error);
      }

      originalRequest._isRetry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(REFRESH_URL, {}, { withCredentials: true })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return axios(originalRequest);
      } catch (_refreshError) {
        return Promise.reject(error);
      }
    }
  );
}

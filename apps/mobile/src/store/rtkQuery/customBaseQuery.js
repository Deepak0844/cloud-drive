import axios, { isCancel } from "axios";

// Utils
import { TokenStorage } from "@utils/tokenStorage";

// Actions
import { resetAuth } from "@redux-slices/authSlice";

// Config
import Config from "@config";

// One in-flight refresh promise shared across concurrent 401 callers —
// prevents the thundering-herd where N failing requests each trigger a refresh.
let _refreshPromise = null;

function makeRequest(args, token, signal) {
  const { url = "", method = "get", params, body, data: rawData, headers: callerHeaders } = args;
  const data = body ?? rawData;
  const isFormData = data != null && typeof data.append === "function";

  return axios({
    url: Config.API_SERVICE_URL + url,
    method,
    params,
    data,
    headers: {
      "X-Platform": "mobile",
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...callerHeaders,
      ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
    },
    ...(isFormData ? { transformRequest: (d) => d } : {}),
    signal,
  });
}

export const customBaseQuery = async (rawArgs, api) => {
  const args = typeof rawArgs === "string" ? { url: rawArgs } : rawArgs;
  const accessToken = await TokenStorage.getAccessToken();

  try {
    const response = await makeRequest(args, accessToken, api.signal);
    return { data: response.data };
  } catch (error) {
    if (isCancel(error)) throw error;

    const status = error.response?.status;

    if (__DEV__ && !args.skipAuthRetry) {
      console.error("[customBaseQuery]", { url: args.url, status, message: error.message });
    }

    if (status !== 401 || args.skipAuthRetry) {
      return {
        error: {
          status: status ?? "NETWORK_ERROR",
          data: error.response?.data ?? error.message,
          ...(args.suppressGlobalError && { suppressGlobalError: true }),
        },
      };
    }

    // --- Silent refresh on 401 ---
    const refreshToken = await TokenStorage.getRefreshToken();
    if (!refreshToken) {
      await TokenStorage.clearTokens();
      api.dispatch(resetAuth());
      return { error: { status: 401, data: error.response?.data } };
    }

    if (!_refreshPromise) {
      _refreshPromise = axios({
        url: Config.API_SERVICE_URL + "/api/v1/auth/refresh",
        method: "post",
        headers: { "X-Platform": "mobile", "X-Refresh-Token": refreshToken },
      })
        .then(async (response) => {
          const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data;
          if (!newAccess || !newRefresh) {
            throw new Error("refresh response missing tokens");
          }
          await TokenStorage.setAccessToken(newAccess);
          await TokenStorage.setRefreshToken(newRefresh);
          return newAccess;
        })
        .finally(() => {
          _refreshPromise = null;
        });
    }

    let newAccessToken;
    try {
      newAccessToken = await _refreshPromise;
    } catch (refreshError) {
      if (__DEV__) console.error("[customBaseQuery] refresh failed", refreshError.message);
      await TokenStorage.clearTokens();
      api.dispatch(resetAuth());
      return {
        error: {
          status: refreshError.response?.status ?? "NETWORK_ERROR",
          data: refreshError.response?.data ?? refreshError.message,
        },
      };
    }

    try {
      const retryResponse = await makeRequest(args, newAccessToken, api.signal);
      return { data: retryResponse.data };
    } catch (retryError) {
      if (isCancel(retryError)) throw retryError;
      return {
        error: {
          status: retryError.response?.status ?? "NETWORK_ERROR",
          data: retryError.response?.data ?? retryError.message,
        },
      };
    }
  }
};

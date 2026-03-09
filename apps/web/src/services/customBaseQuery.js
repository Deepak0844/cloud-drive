import axios from "axios";

// Utils
import HttpClientFactory from "../utils/httpClientFactory";

/**
 * Custom Base Query for RTK Query.
 * Adapts RTK Query's request format to our HttpClient.
 */
const customBaseQuery =
  ({ baseUrl = "" } = {}) =>
  async (rawArgs, api) => {
    // Normalize args: RTK Query allows a string for simple GET requests
    const args = typeof rawArgs === "string" ? { url: rawArgs } : rawArgs;
    const {
      url = "",
      method = "get",
      params: rawParams,
      data: rawData,
      body: rawBody,
      contentType,
      onError,
      responseType,
      responseHandler,
      downloadMethod,
    } = args;

    const getUiFlags = (obj) => {
      if (!obj || typeof obj !== "object") return {};
      const flags = {};
      if (obj.showToast !== undefined) flags.showToast = obj.showToast;
      if (obj.showPageError !== undefined) flags.showPageError = obj.showPageError;
      if (obj.suppressGlobalError !== undefined) flags.suppressGlobalError = obj.suppressGlobalError;
      return flags;
    };

    // Filter out UI-only configuration flags so they aren't sent to the server
    const filterUiFlags = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      const {
        showToast: _showToast,
        showPageError: _showPageError,
        suppressGlobalError: _suppressGlobalError,
        ...rest
      } = obj;
      return rest;
    };

    const uiFlagsFromParams = getUiFlags(rawParams);
    const uiFlagsFromData = getUiFlags(rawData || rawBody);
    const uiFlagsFromOnError = getUiFlags(onError);

    // Combine flags (onError takes precedence over data/body, which takes precedence over params)
    const uiFlags = {
      ...uiFlagsFromParams,
      ...uiFlagsFromData,
      ...uiFlagsFromOnError,
    };

    const params = filterUiFlags(rawParams);
    // Standardize body/data: rawBody is the RTK Query standard, rawData is our HttpClient standard
    const data = filterUiFlags(rawData || rawBody);

    try {
      const httpClient = HttpClientFactory.getInstance();
      const finalUrl = baseUrl + url;
      const lowerMethod = method.toLowerCase();
      const resolvedResponseType = responseType || (typeof responseHandler === "string" ? responseHandler : undefined);

      const methodMap = {
        get: () =>
          httpClient.get(finalUrl, params, contentType, {
            signal: api.signal,
            ...(resolvedResponseType && { responseType: resolvedResponseType }),
          }),
        post: () =>
          httpClient.post(finalUrl, params, data, contentType, {
            signal: api.signal,
            ...(resolvedResponseType && { responseType: resolvedResponseType }),
          }),
        put: () =>
          httpClient.put(finalUrl, params, data, contentType, {
            signal: api.signal,
            ...(resolvedResponseType && { responseType: resolvedResponseType }),
          }),
        patch: () =>
          httpClient.patch(finalUrl, params, data, contentType, {
            signal: api.signal,
            ...(resolvedResponseType && { responseType: resolvedResponseType }),
          }),
        delete: () =>
          httpClient.delete(finalUrl, params, data, contentType, {
            signal: api.signal,
            ...(resolvedResponseType && { responseType: resolvedResponseType }),
          }),
        download: () =>
          httpClient.download(
            finalUrl,
            params,
            data,
            contentType,
            {
              signal: api.signal,
              ...(resolvedResponseType && { responseType: resolvedResponseType }),
            },
            downloadMethod || "GET"
          ),
      };

      if (!methodMap[lowerMethod]) {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const result = await methodMap[lowerMethod]();

      return { data: result };
    } catch (error) {
      if (axios.isCancel?.(error) || error.code === "ERR_CANCELED") {
        throw error;
      }

      return {
        error: {
          status: error.response?.status,
          data: error.response?.data || error.message,
          // Pass flags back to the middleware
          ...uiFlags,
        },
      };
    }
  };

export default customBaseQuery;

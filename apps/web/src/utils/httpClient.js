import axios from "axios";

// Constants
import { HttpContentTypes, HttpHeaders, HttpMethods } from "@shared-constants/constants";

// Utils
import ApiUtils from "@services/api/apiUtils";

/**
 * HttpClient wrapper around Axios.
 * All requests include `withCredentials: true` so the browser sends
 * the HttpOnly auth cookie automatically on every call.
 */
class HttpClient {
  get = async (url, params = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.GET,
      url,
      params,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      withCredentials: true,
      ...options,
    });

    return response.data;
  };

  post = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.POST,
      url,
      params,
      data,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      withCredentials: true,
      ...options,
    });

    return response.data;
  };

  put = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.PUT,
      url,
      params,
      data,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      withCredentials: true,
      ...options,
    });

    return response.data;
  };

  patch = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.PATCH,
      url,
      params,
      data,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      withCredentials: true,
      ...options,
    });

    return response.data;
  };

  delete = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.DELETE,
      url,
      params,
      data,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      withCredentials: true,
      ...options,
    });

    return response.data;
  };
}

export default HttpClient;

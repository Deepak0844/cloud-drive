import axios from "axios";

// Constants
import { HttpContentTypes, HttpHeaders, HttpMethods } from "../constants/httpConstants";

// Utils
import ApiUtils from "@/store/api/apiUtils";

/**
 * HttpClient wrapper around Axios.
 */
class HttpClient {
  authToken = false;

  constructor(authToken) {
    this.authToken = authToken;
  }

  /**
   * GET request
   */
  get = async (url, params = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Authorization]: this.authToken ? `Bearer ${this.authToken}` : "",
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      ...(contentType && { [HttpHeaders.ContentType]: contentType }),
    };

    const response = await axios({
      method: HttpMethods.GET,
      url,
      params,
      paramsSerializer: { serialize: ApiUtils.serializeParams },
      headers,
      ...options,
    });

    if (options.responseType === "blob") {
      return response.data; // For blobs, returning data directly is standard Axios practice, BUT...
      // wait, earlier I changed FileItem to read `response.size > 0`.
      // The `response.data` IS the Blob object itself.
      // So returning `response.data` is actually correct. The mistake is in FileItem.jsx.
    }

    return response.data;
  };

  /**
   * POST request
   */
  post = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Authorization]: this.authToken ? `Bearer ${this.authToken}` : "",
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
      ...options,
    });

    return response.data;
  };

  /**
   * PUT request
   */
  put = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Authorization]: this.authToken ? `Bearer ${this.authToken}` : "",
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
      ...options,
    });

    return response.data;
  };

  /**
   * DELETE request
   */
  delete = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Authorization]: this.authToken ? `Bearer ${this.authToken}` : "",
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
      ...options,
    });

    return response.data;
  };
}

export default HttpClient;

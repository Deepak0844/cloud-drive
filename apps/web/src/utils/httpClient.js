import axios from "axios";

// Constants
import { HttpContentTypes, HttpHeaders, HttpMethods } from "../constants/httpConstants";

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
      [HttpHeaders.ContentType]: contentType,
    };

    const response = await axios({
      method: HttpMethods.GET,
      url,
      params,
      headers,
      ...options,
    });

    return response.data;
  };

  /**
   * POST request
   */
  post = async (url, params = {}, data = {}, contentType = HttpContentTypes.APP_JSON, options = {}) => {
    const headers = {
      [HttpHeaders.Authorization]: this.authToken ? `Bearer ${this.authToken}` : "",
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      [HttpHeaders.ContentType]: contentType,
    };

    const response = await axios({
      method: HttpMethods.POST,
      url,
      params,
      data,
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
      [HttpHeaders.ContentType]: contentType,
    };

    const response = await axios({
      method: HttpMethods.PUT,
      url,
      params,
      data,
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
      [HttpHeaders.ContentType]: contentType,
    };

    const response = await axios({
      method: HttpMethods.DELETE,
      url,
      params,
      data,
      headers,
      ...options,
    });

    return response.data;
  };
}

export default HttpClient;

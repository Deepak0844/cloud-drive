import axios from "axios";

// Constants
import { HttpContentTypes, HttpHeaders, HttpMethods } from "./constants/httpConstants";

// Convert False to String
function convertFalseToString(params, key) {
  if (params[key] === false) {
    params[key] = "false";
  }
}

// Convert String to False
function convertStringToFalse(params, key) {
  if (params[key] === "false") {
    params[key] = false;
  }
}

// Private Utilities
// --------------------------------------------------------------------------------
function serializeParams(params) {
  // options
  let options = "";

  for (const key in params) {
    convertFalseToString(params, key);

    if (typeof params[key] !== "object" && params[key]) {
      convertStringToFalse(params, key);

      // update options
      options += `${key}=${params[key]}&`;
    } else if (typeof params[key] === "object" && params[key] && params[key].length) {
      params[key].forEach((el) => (options += `${key}=${el}&`));
    }
  }

  // final return
  return options ? options.slice(0, -1) : options;
}

// HttpClient
// --------------------------------------------------------------------------------
class HttpClient {
  //
  constructor(authToken = "") {
    this.authToken = authToken;
  }

  setToken(authToken) {
    this.authToken = authToken;
  }

  resetToken() {
    this.authToken = "";
  }

  // Function to Construct Header
  getHeaders(contentType = HttpContentTypes.APP_JSON) {
    const headers = {
      [HttpHeaders.Accept]: HttpContentTypes.APP_JSON,
      [HttpHeaders.ContentType]: contentType,
    };

    if (this.authToken) {
      headers[HttpHeaders.Authorization] = "Bearer " + this.authToken;
    }

    return headers;
  }

  // Method :: GET
  async get(url = "", params = {}, contentType = HttpContentTypes.APP_JSON) {
    // Invoke Axios
    const response = await axios({
      method: HttpMethods.GET,
      url,
      params,
      headers: this.getHeaders(contentType),
      paramsSerializer: serializeParams,
    });

    return response.data;
  }

  // Method :: POST
  async post(url = "", params = {}, data = {}, contentType = HttpContentTypes.APP_JSON) {
    // Invoke Axios
    const response = await axios({
      method: HttpMethods.POST,
      url,
      params,
      data,
      headers: this.getHeaders(contentType),
    });

    return response.data;
  }

  // Method :: PUT
  async put(url = "", params = {}, data = {}, contentType = HttpContentTypes.APP_JSON) {
    // Invoke Axios
    const response = await axios({
      method: HttpMethods.PUT,
      url,
      params,
      data,
      headers: this.getHeaders(contentType),
    });

    return response.data;
  }

  // Method :: DELETE
  async delete(url = "", params = {}, data = {}, contentType = HttpContentTypes.APP_JSON) {
    // Invoke Axios
    const response = await axios({
      method: HttpMethods.DELETE,
      url,
      params,
      data,
      headers: this.getHeaders(contentType),
    });

    return response.data;
  }

  // Method :: DOWNLOAD FILE
  async downloadFile(url, params = {}, headers = {}, responseType = "blob") {
    // Invoke Axios
    const response = await axios({
      url,
      method: HttpMethods.GET,
      params,
      headers: {
        ...headers,
        [HttpHeaders.Authorization]: this.authToken ? "Bearer " + this.authToken : "",
      },
      responseType,
    });

    return response.data;
  }
}

/**
 * Default export
 */
export default HttpClient;

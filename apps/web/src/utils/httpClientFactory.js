// Utils
import AuthUtils from "./authUtils";
import HttpClient from "./httpClient";

/**
 * Factory for HttpClient instances.
 * Implements a Singleton pattern for the primary API client.
 */
class HttpClientFactory {
  httpClient = false;

  /**
   * Resets the singleton instance.
   */
  reset = () => {
    this.httpClient = false;
  };

  /**
   * Reloads the HttpClient instance with the current auth token.
   */
  reload = () => {
    const authToken = AuthUtils.getToken();
    this.httpClient = new HttpClient(authToken);
  };

  /**
   * Returns the singleton instance of HttpClient.
   * If it doesn't exist, it reloads/creates it.
   */
  getInstance = () => {
    if (!this.httpClient) {
      this.reload();
    }
    return this.httpClient;
  };

  /**
   * Creates a fresh HttpClient instance with a specific token.
   */
  newInstance = (authToken) => {
    return new HttpClient(authToken);
  };
}

const HttpInstance = new HttpClientFactory();

export default HttpInstance;

// Utils
import HttpClient from "./httpClient";

/**
 * Factory for HttpClient instances.
 * Implements a Singleton pattern for the primary API client.
 * With cookie-based auth the client needs no auth token —
 * the browser sends the HttpOnly cookie automatically.
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
   * Reloads (recreates) the HttpClient singleton.
   */
  reload = () => {
    this.httpClient = new HttpClient();
  };

  /**
   * Returns the singleton instance of HttpClient.
   * Creates it if it doesn't exist yet.
   */
  getInstance = () => {
    if (!this.httpClient) {
      this.reload();
    }
    return this.httpClient;
  };

  /**
   * Creates a fresh HttpClient instance.
   */
  newInstance = () => {
    return new HttpClient();
  };
}

const HttpInstance = new HttpClientFactory();

export default HttpInstance;

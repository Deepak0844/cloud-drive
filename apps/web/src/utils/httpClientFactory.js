// Utils
import HttpClient from "./httpClient";

/**
 * Factory for HttpClient instances.
 * Implements a Singleton pattern for the primary API client.
 * With cookie-based auth the client needs no auth token —
 * the browser sends the HttpOnly cookie automatically.
 *
 * @description
 * Design boundary — HttpClient vs. RTK Query:
 *
 * - Use `HttpInstance.getInstance()` (HttpClient) for:
 *     • File downloads and streaming (non-cacheable blobs)
 *     • One-off mutations where you need direct control over the request lifecycle
 *     • Any call that does not benefit from RTK Query cache invalidation
 *
 * - Use RTK Query (which uses HttpClient internally via customBaseQuery) for:
 *     • Data reads shared across multiple components
 *     • Anything needing cache invalidation via providesTags / invalidatesTags
 *     • Loading and error states managed by the Redux store
 *
 * The axios silent-refresh interceptor (axiosInterceptors.js) covers both
 * layers automatically — no special handling needed in either.
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

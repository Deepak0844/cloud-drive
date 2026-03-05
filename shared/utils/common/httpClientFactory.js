// Http Client
import HttpClient from "./httpClient";

//
// Factory Implementation of HttpClient
// ----------------------------------------------------------------------------
class HttpClientFactory {
  // Properties
  httpClient = false;
  authToken = "";

  constructor(authToken) {
    this.authToken = authToken;
  }

  // Methods
  // --------------------------------------------------------------------------

  // Singleton Pattern --------------------------------------------------------

  // reset
  reset = () => {
    this.httpClient = false;
  };

  /**
   * Refreshes the HttpClient Instance (creates a new one) with the authToken.
   */
  reload = (authToken) => {
    this.authToken = authToken;

    // Update the HTTP Client Instance
    this.httpClient = new HttpClient(authToken);
  };

  /**
   * Get the Singleton instance of the HttpClient object. The AuthToken for this loaded via the #reload() method.
   *
   * @returns HttpClient instance
   */
  getInstance = () => {
    // Check if HttpClient object is instantiated
    if (!this.httpClient) {
      this.reload(this.authToken);
    }

    return this.httpClient;
  };

  // New Instance Pattern -----------------------------------------------------
  /**
   * Creates a new HttpClient instance with the passed authToken.
   *
   * @param {*} authToken User given AuthToken String
   * @returns HttpClient instance
   */
  newInstance = (authToken) => {
    // Http Client
    const httpClient = new HttpClient(authToken);
    return httpClient;
  };
}

// Exports
// --------------------------------------------------------------------
// Http Client Factory
export default HttpClientFactory;

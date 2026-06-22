/**
 * Environment-specific config.
 */

// Default configuration
const _config = {
  API_SERVICE_URL: "https://api.example.com",
  DB_NAME: "app.db",
};

// Production configuration
const _config_prod = {
  ..._config,
};

// Development configuration
const _config_dev = {
  ..._config,
  API_SERVICE_URL: "http://10.0.2.2:9000",
};

// Pick env-specific configuration
const Config = __DEV__ ? _config_dev : _config_prod;

export default Config;

import { jwtDecode } from "jwt-decode";

/**
 * isTokenExpired -Checks whether a token is expired
 * @param {string} authToken - JWT token
 * @returns {boolean} true if expired, false otherwise
 */
function isTokenExpired(authToken) {
  const decoded = jwtDecode(authToken);
  return decoded.exp * 1000 < Date.now();
}

/**
 * isUserAuthenticated - Validates if a user is authenticated
 * @param {object} user - User object containing token and privileges
 * @returns {boolean} true if authenticated, false otherwise
 */
function isUserAuthenticated(user = {}) {
  const isUserPresent = Object.keys(user).length === 0;

  if (isUserPresent) {
    return false;
  }

  const { token = "" } = user;
  return Boolean(token) && !isTokenExpired(token);
}

const TokenUtils = {
  isTokenExpired,
  isUserAuthenticated,
};

export default TokenUtils;

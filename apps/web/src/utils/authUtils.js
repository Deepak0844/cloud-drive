// Constants
import { STORAGE_KEYS } from "@shared-constants/constants";

// Utils
import LocalStorage from "./localStorageUtils";

/**
 * Authentication and Authorization related Utilities.
 * With cookie-based auth the JWT lives in an HttpOnly cookie managed by the
 * browser — it is never accessible to JavaScript. Only the user's profile
 * object is stored in localStorage for UI purposes (role, name, etc.).
 */

function isUserAuthenticated() {
  // Cookie validity is enforced by the server on every request.
  // On the client side, we infer the session is alive if the user object exists.
  // If the cookie has expired the next API call returns 401 and the error
  // middleware clears the session and redirects to login.
  const user = LocalStorage.get(STORAGE_KEYS.USER);
  return !!user;
}

/**
 * Stores the logged-in user's profile in localStorage (for UI use only — NOT the token).
 */
function storeUserInfoInLocalStorage(data) {
  const { user } = data;
  if (user) LocalStorage.set(STORAGE_KEYS.USER, user);
}

function clearSession() {
  LocalStorage.clear(STORAGE_KEYS.USER);
}

/**
 * Returns the current user's role from localStorage, or null if not found.
 */
function getUserRole() {
  const user = LocalStorage.get(STORAGE_KEYS.USER);
  return user?.role ?? null;
}

/**
 * Checks if the current user has the given role.
 */
function isRole(role) {
  return getUserRole() === role;
}

const AuthUtils = {
  isUserAuthenticated,
  storeUserInfoInLocalStorage,
  clearSession,
  getUserRole,
  isRole,
};

export default AuthUtils;

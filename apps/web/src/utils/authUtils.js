// external
import { jwtDecode } from "jwt-decode";

// Constants
import { STORAGE_KEYS } from "../constants/generalConstants";

// Utils
import LocalStorage from "./localStorageUtils";

/**
 * Authentication and Authorization related Utilities.
 */
function getToken() {
  return LocalStorage.get(STORAGE_KEYS.TOKEN) || "";
}

function isUserAuthenticated() {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    if (!decoded || !decoded.exp) return true; // Fallback if no exp claim

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < currentTime;

    if (isExpired) {
      clearSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Function to store the loggedIn user info in the Local Storage.
 */
function storeUserInfoInLocalStorage(data) {
  const { token, user } = data;

  if (token) LocalStorage.set(STORAGE_KEYS.TOKEN, token);
  if (user) LocalStorage.set(STORAGE_KEYS.USER, user);
}

function clearSession() {
  LocalStorage.clear(STORAGE_KEYS.TOKEN);
  LocalStorage.clear(STORAGE_KEYS.USER);
}

const AuthUtils = {
  getToken,
  isUserAuthenticated,
  storeUserInfoInLocalStorage,
  clearSession,
};

export default AuthUtils;

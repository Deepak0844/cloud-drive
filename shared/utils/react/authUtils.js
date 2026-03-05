// Constants
import { LocalStorageKeys } from "../constants/localStorageConstants";

// Utils
import LocalStorageUtils from "./localStorageUtils";

/**
 * Stores the loggedInData in the LocalStorage
 * @param {Object} loggedInData
 * @return {void}
 */
function storeLoggedInDataInLocalStorage(loggedInData = {}) {
  const { userId = "", token = "", org = "", firstName = "", lastName = "" } = loggedInData;

  // Set Token
  LocalStorageUtils.set(LocalStorageKeys.TOKEN, token);

  // Set User Details
  LocalStorageUtils.set(LocalStorageKeys.FIRST_NAME, firstName);
  LocalStorageUtils.set(LocalStorageKeys.LAST_NAME, lastName);
  LocalStorageUtils.set(LocalStorageKeys.USER_ID, userId);

  // Set Org Info
  LocalStorageUtils.set(LocalStorageKeys.AUTH_ORG, JSON.stringify(org));
}

/**
 * Set Auth Token in the LocalStorage
 * @param {String} authToken
 * @returns {void}
 */
function setToken(authToken = "") {
  LocalStorageUtils.set(LocalStorageKeys.TOKEN, authToken);
}

/**
 * Gets Token from the LocalStorage
 * @returns {String}
 */
function getToken() {
  return LocalStorageUtils.get(LocalStorageKeys.TOKEN) || "";
}

/**
 * Removes the Token from the LocalStorage
 * @returns {void}
 */
function removeToken() {
  LocalStorageUtils.remove(LocalStorageKeys.TOKEN);
}

/**
 * Gets Organization ID from the LocalStorage
 * @returns {Number}
 */
function getOrgId() {
  const { id = "" } = JSON.parse(LocalStorageUtils.get(LocalStorageKeys.AUTH_ORG) || "{}");
  return id;
}

/**
 * Gets Organization Info from the LocalStorage
 * @returns {Object}
 */
function getOrgInfo() {
  return JSON.parse(LocalStorageUtils.get(LocalStorageKeys.AUTH_ORG) || "{}");
}

/**
 * Gets Organization Type from the LocalStorage
 * @returns {String}
 */
function getOrgType() {
  const { type = "" } = JSON.parse(LocalStorageUtils.get(LocalStorageKeys.AUTH_ORG) || "{}");
  return type;
}

/**
 * Gets User ID from the LocalStorage
 * @returns {Number}
 */
function getUserId() {
  return LocalStorageUtils.get(LocalStorageKeys.USER_ID) || "";
}

/**
 * Gets User Info from the LocalStorage
 * @returns {Object}
 */
function getUserInfo() {
  return JSON.parse(LocalStorageUtils.get(LocalStorageKeys.AUTH_USER) || "{}");
}

const AuthUtils = {
  //
  storeLoggedInDataInLocalStorage,

  //
  setToken,
  getToken,
  removeToken,

  //
  getOrgId,
  getOrgInfo,
  getOrgType,

  //
  getUserId,
  getUserInfo,
};

export default AuthUtils;

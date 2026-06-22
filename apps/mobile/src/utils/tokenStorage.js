import * as SecureStore from "expo-secure-store";

const AccessKey = "access_token";
const RefreshKey = "refresh_token";
const RoleKey = "user_role";

function getAccessToken() {
  return SecureStore.getItemAsync(AccessKey);
}

function getAccessTokenSync() {
  return SecureStore.getItem(AccessKey);
}

function setAccessToken(v) {
  return SecureStore.setItemAsync(AccessKey, v);
}

function getRefreshToken() {
  return SecureStore.getItemAsync(RefreshKey);
}

function setRefreshToken(v) {
  return SecureStore.setItemAsync(RefreshKey, v);
}

function getRole() {
  return SecureStore.getItemAsync(RoleKey);
}

function getRoleSync() {
  return SecureStore.getItem(RoleKey);
}

function setRole(v) {
  return SecureStore.setItemAsync(RoleKey, v);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(AccessKey);
  await SecureStore.deleteItemAsync(RefreshKey);
  await SecureStore.deleteItemAsync(RoleKey);
}

export const TokenStorage = {
  getAccessToken,
  getAccessTokenSync,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getRole,
  getRoleSync,
  setRole,
  clearTokens,
};

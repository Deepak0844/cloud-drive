import User from "../../models/User.js";

/**
 * Create a test user
 */
export async function createTestUser(userData = {}) {
  const defaultUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
    role: "USER",
    quota_bytes: 5 * 1000 * 1000 * 1000, // 5GB
    used_bytes: 0,
    is_active: true,
  };

  const user = await User.create({ ...defaultUser, ...userData });
  return user;
}

/**
 * Create an admin user
 */
export function createAdminUser(userData = {}) {
  return createTestUser({ ...userData, role: "ADMIN", email: "admin@example.com" });
}

/**
 * Generate auth token for a user
 */
export function generateAuthToken(user) {
  return user.getSignedJwtToken();
}

/**
 * Get auth header with token
 */
export function getAuthHeader(user) {
  const token = generateAuthToken(user);
  return { Authorization: `Bearer ${token}` };
}

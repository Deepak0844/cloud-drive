import request from "supertest";

import app from "#app";
import User from "#models/User.js";
import { setupTests, teardownTests, resetTests } from "#test-helpers/db.helper.js";
import { createTestUser, generateAuthToken } from "#test-helpers/auth.helper.js";

const LOGIN_URL = "/api/v1/auth/login";
const CSRF_TOKEN_URL = "/api/v1/csrf-token";
const PROFILE_URL = "/api/v1/auth/me";

const TEST_PASSWORD = "TestPass@123!";

/**
 * Log in via cookie auth and return the Set-Cookie header strings.
 */
async function loginAndGetCookies(email) {
  const res = await request(app).post(LOGIN_URL).send({ email, password: TEST_PASSWORD });
  return res.headers["set-cookie"] || [];
}

/**
 * Fetch a CSRF token and return { csrfCookieHeader, csrfToken }.
 * The csrfCookieHeader is the raw Set-Cookie string for the csrf_token cookie.
 */
async function fetchCsrfToken() {
  const res = await request(app).get(CSRF_TOKEN_URL).expect(200);
  const csrfCookieHeader = (res.headers["set-cookie"] || []).find((c) =>
    c.startsWith("csrf_token=")
  );
  const csrfToken = res.body.data?.csrfToken;
  return { csrfCookieHeader, csrfToken };
}

describe("Security hardening", () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
  });

  // ── bcrypt ──────────────────────────────────────────────────────────────────

  describe("bcrypt work factor", () => {
    it("test_register_bcryptCost_hashCarriesWorkFactor11", async () => {
      await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Security Test", email: "sec@example.com", password: TEST_PASSWORD })
        .expect(201);

      const stored = await User.findOne({ email: "sec@example.com" }).select("+password");
      expect(stored.password).toMatch(/^\$2[aby]\$11\$/);
    });

    it("test_login_bcryptCost_newUserLoginSucceeds", async () => {
      await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Security Test", email: "sec@example.com", password: TEST_PASSWORD })
        .expect(201);

      await request(app)
        .post(LOGIN_URL)
        .send({ email: "sec@example.com", password: TEST_PASSWORD })
        .expect(200);
    });
  });

  // ── CSRF ────────────────────────────────────────────────────────────────────

  describe("CSRF enforcement", () => {
    it("test_verifyCsrf_cookieMutationWithoutToken_returns403", async () => {
      const user = await createTestUser({ password: TEST_PASSWORD });
      const authCookies = await loginAndGetCookies(user.email);

      await request(app)
        .put(PROFILE_URL)
        .set("Cookie", authCookies)
        .send({ name: "Hacked" })
        .expect(403);
    });

    it("test_verifyCsrf_cookieMutationWithValidToken_succeeds", async () => {
      const user = await createTestUser({ password: TEST_PASSWORD });
      const authCookies = await loginAndGetCookies(user.email);
      const { csrfCookieHeader, csrfToken } = await fetchCsrfToken();

      const allCookies = [...authCookies, csrfCookieHeader].filter(Boolean);

      await request(app)
        .put(PROFILE_URL)
        .set("Cookie", allCookies)
        .set("x-csrf-token", csrfToken)
        .send({ name: "Legit Update" })
        .expect(200);
    });

    it("test_verifyCsrf_bearerTokenMutation_notBlocked", async () => {
      const user = await createTestUser({ password: TEST_PASSWORD });
      const token = generateAuthToken(user);

      // Bearer request carries no auth cookie — verifyCsrf must not block it.
      await request(app)
        .put(PROFILE_URL)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Bearer Update" })
        .expect(200);
    });

    it("test_verifyCsrf_safeMethod_notBlocked", async () => {
      const user = await createTestUser({ password: TEST_PASSWORD });
      const authCookies = await loginAndGetCookies(user.email);

      // GET is safe — must never be blocked regardless of missing CSRF token.
      await request(app).get(PROFILE_URL).set("Cookie", authCookies).expect(200);
    });
  });

  // ── NoSQL sanitization ───────────────────────────────────────────────────────

  describe("NoSQL operator sanitization", () => {
    it("test_sanitizeMongo_loginWithOperatorInEmail_returns4xx", async () => {
      const response = await request(app)
        .post(LOGIN_URL)
        .send({ email: { $gt: "" }, password: "x" })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(res.status).toBeLessThan(500);
        });

      // Must not have issued an auth cookie.
      const setCookie = response.headers["set-cookie"] || [];
      const hasAuthCookie = setCookie.some((c) => c.startsWith("token="));
      expect(hasAuthCookie).toBe(false);
    });
  });
});

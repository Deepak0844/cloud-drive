import { jest } from "@jest/globals";
import request from "supertest";

// App
import app from "../../app.js";

// Models
import User from "../../models/User.js";

// Services
import EmailService from "../../services/email.service.js";

// Helpers
import { setupTests, teardownTests, resetTests } from "../helpers/db.helper.js";
import { createTestUser, getAuthHeader } from "../helpers/auth.helper.js";

describe("Auth API", () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await resetTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      const response = await request(app).post("/api/v1/auth/register").send(userData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.role).toBe("USER");
    });

    it("should fail with missing fields", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({ email: "test@example.com" }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should fail with existing email", async () => {
      await createTestUser({ email: "test@example.com" });
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Test User", email: "test@example.com", password: "password123" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    let user;
    const password = "password123";

    beforeEach(async () => {
      user = await createTestUser({ password });
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({ email: user.email, password }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it("should fail with invalid password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "wrongpassword" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should fail for deactivated account", async () => {
      user.is_active = false;
      await user.save();

      await request(app).post("/api/v1/auth/login").send({ email: user.email, password }).expect(403);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return current user details", async () => {
      const user = await createTestUser();
      const authHeader = getAuthHeader(user);

      const response = await request(app).get("/api/v1/auth/me").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(user.email);
    });

    it("should fail without token", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      const user = await createTestUser();
      const authHeader = getAuthHeader(user);

      const response = await request(app).post("/api/v1/auth/logout").set(authHeader).expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should send reset email", async () => {
      const user = await createTestUser();
      const sendEmailSpy = jest.spyOn(EmailService, "sendEmail").mockResolvedValue(true);

      const response = await request(app).post("/api/v1/auth/forgot-password").send({ email: user.email }).expect(200);

      expect(response.body.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalled();

      const updatedUser = await User.findOne({ email: user.email });
      expect(updatedUser.resetPasswordToken).toBeDefined();
    });

    it("should fail for non-existent email", async () => {
      await request(app).post("/api/v1/auth/forgotpassword").send({ email: "non@example.com" }).expect(404);
    });
  });

  describe("PUT /api/v1/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      const user = await createTestUser();
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const response = await request(app)
        .put("/api/v1/auth/reset-password")
        .send({ token: resetToken, password: "newpassword123" })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify login with new password
      await request(app).post("/api/v1/auth/login").send({ email: user.email, password: "newpassword123" }).expect(200);
    });

    it("should fail with invalid token", async () => {
      await request(app)
        .put("/api/v1/auth/reset-password")
        .send({ token: "invalid", password: "newpassword" })
        .expect(400);
    });
  });
});

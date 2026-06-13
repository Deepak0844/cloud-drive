import { z } from "zod";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).+$/;
const PASSWORD_RULES = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(PASSWORD_REGEX, "Password must contain at least one uppercase letter, one number, and one special character");

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: PASSWORD_RULES,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    password: PASSWORD_RULES,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    notification_preferences: z
      .object({
        email_notifications: z.boolean().optional(),
        storage_alerts: z.boolean().optional(),
        security_alerts: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: PASSWORD_RULES,
  }),
});

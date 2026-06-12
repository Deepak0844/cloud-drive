// Utils
import * as z from "zod";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).+$/;
export const passwordRules = z
  .string()
  .min(12, { message: "Password must be at least 12 characters." })
  .regex(PASSWORD_REGEX, {
    message: "Password must contain at least one uppercase letter, one number, and one special character.",
  });

export const loginSchema = z.object({
  email: z.string().min(1, { message: "Please input your email!" }).email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Please input your password!" }),
  remember: z.boolean().default(true),
});

export const registerSchema = z.object({
  name: z.string().min(1, { message: "Please input your name!" }),
  email: z.string().min(1, { message: "Please input your email!" }).email({ message: "Invalid email address" }),
  password: passwordRules,
});

export const forgotSchema = z.object({
  email: z.string().min(1, { message: "Please enter a valid email address." }).email({ message: "Invalid email" }),
});

export const resetSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

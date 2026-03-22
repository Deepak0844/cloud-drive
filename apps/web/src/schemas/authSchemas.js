// Utils
import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, { message: "Please input your email!" }).email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Please input your password!" }),
  remember: z.boolean().default(true),
});

export const registerSchema = z.object({
  name: z.string().min(1, { message: "Please input your name!" }),
  email: z.string().min(1, { message: "Please input your email!" }).email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters!" }),
});

export const forgotSchema = z.object({
  email: z.string().min(1, { message: "Please enter a valid email address." }).email({ message: "Invalid email" }),
});

export const resetSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

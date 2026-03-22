// Utils
import * as z from "zod";

export const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  email_notifications: z.boolean(),
  storage_alerts: z.boolean(),
  security_alerts: z.boolean(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Please enter your current password" }),
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(1, { message: "Please confirm your new password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

// React core & third-party libraries
import React, { useEffect } from "react";
import { message } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Services (RTK Query hooks)
import { useUpdatePasswordMutation } from "@services/api/authApi";

// Components
import Modal from "@shared-components/components/modal";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Please enter your current password" }),
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(1, { message: "Please confirm your new password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

function ChangePasswordModal({ open, onClose }) {
  // RTK Query hooks
  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  // Custom & shared hooks

  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  // Event handlers
  async function handleOk(values) {
    try {
      await updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();

      message.success("Password updated successfully!");
      form.reset();
      onClose();
    } catch (err) {
      const errorMessage =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.data?.error ||
        (typeof err?.data === "string" ? err.data : null);

      if (errorMessage === "Incorrect current password") {
        form.setError("currentPassword", { type: "server", message: errorMessage });
      } else if (errorMessage) {
        message.error(errorMessage);
      } else {
        message.error("Failed to update password");
      }
    }
  }

  function handleCancel() {
    form.reset();
    onClose();
  }

  // Render
  return (
    <Modal
      modalTitle="Change Password"
      open={open}
      handleSubmit={form.handleSubmit(handleOk)}
      handleCloseModal={handleCancel}
      btnLoading={isLoading}
      btnText="Update Password"
    >
      <Form {...form}>
        <form id="change-password-form" onSubmit={form.handleSubmit(handleOk)} className="space-y-4 pt-2">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Current Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="New Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirm New Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </Modal>
  );
}

export default ChangePasswordModal;

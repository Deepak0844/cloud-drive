// external
import { Form, Input, message } from "antd";
import Modal from "@shared-components/components/modal";
import React from "react";

// api
import { useUpdatePasswordMutation } from "@services/api/authApi";

function ChangePasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  async function handleOk() {
    try {
      const values = await form.validateFields();

      await updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();

      message.success("Password updated successfully!");
      form.resetFields();
      onClose();
    } catch (err) {
      const errorMessage =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.data?.error ||
        (typeof err?.data === "string" ? err.data : null);

      if (errorMessage === "Incorrect current password") {
        form.setFields([
          {
            name: "currentPassword",
            errors: [errorMessage],
          },
        ]);
      } else if (errorMessage) {
        message.error(errorMessage);
      } else {
        message.error("Failed to update password");
      }
    }
  }

  function handleCancel() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      modalTitle="Change Password"
      open={open}
      handleSubmit={handleOk}
      handleCloseModal={handleCancel}
      btnLoading={isLoading}
      btnText="Update Password"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: "Please enter your current password" }]}
        >
          <Input.Password className="premium-input" placeholder="Current Password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: "Please enter a new password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password className="premium-input" placeholder="New Password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("The two passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password className="premium-input" placeholder="Confirm New Password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ChangePasswordModal;

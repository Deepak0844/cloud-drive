// React core & third-party libraries
import React from "react";
import { Form, Input, InputNumber, message } from "antd";

// Services (RTK Query hooks)
import { useRequestQuotaIncreaseMutation } from "@services/api/quotaApi";

// Components
import Modal from "@shared-components/components/modal";

function QuotaRequestModal({ open, onClose }) {
  // Local state
  const [loading, setLoading] = React.useState(false);

  // RTK Query hooks
  const [requestQuota] = useRequestQuotaIncreaseMutation();

  // Custom & shared hooks
  const [form] = Form.useForm();

  // Event handlers
  async function handleOk() {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await requestQuota({ reason: values.reason, requested_bytes: values.amount * 1000 * 1000 * 1000 }).unwrap();

      message.success("Quota request submitted successfully!");
      form.resetFields();
      setLoading(false);
      onClose();
    } catch (_err) {
      message.error("Validation failed");
    }
  }

  // Render
  return (
    <Modal
      modalTitle="Request Quota Increase"
      open={open}
      handleSubmit={handleOk}
      handleCloseModal={onClose}
      btnLoading={loading}
      btnText="Submit Request"
    >
      <Form form={form} layout="vertical" initialValues={{ amount: 10 }}>
        <Form.Item
          name="amount"
          label="Additional Storage Needed (GB)"
          rules={[{ required: true, message: "Please enter requested amount" }]}
        >
          <InputNumber id="quotaAmount" name="amount" min={1} max={100} className="w-full" />
        </Form.Item>
        <Form.Item
          name="reason"
          label="Reason for Increase"
          rules={[{ required: true, message: "Please provide a reason" }]}
        >
          <Input.TextArea id="quotaReason" name="reason" rows={4} placeholder="Why do you need more storage?" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default QuotaRequestModal;

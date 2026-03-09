// external
import { Form, Input, InputNumber, Modal, message } from "antd";
import React from "react";

import { useRequestQuotaIncreaseMutation } from "@services/api/quotaApi";

function QuotaRequestModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [requestQuota] = useRequestQuotaIncreaseMutation();
  const [loading, setLoading] = React.useState(false);

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

  return (
    <Modal
      title="Request Quota Increase"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Submit Request"
      centered
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

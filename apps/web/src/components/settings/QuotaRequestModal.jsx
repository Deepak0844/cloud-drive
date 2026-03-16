// React core & third-party libraries
import React, { useEffect } from "react";
import { App } from "antd"; // App for toast
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Services (RTK Query hooks)
import { useRequestQuotaIncreaseMutation } from "@services/api/quotaApi";

// Constants
import { ByteMultipliers } from "@shared-constants/constants";

// Components
import Modal from "@shared-components/components/modal";

const quotaSchema = z.object({
  amount: z.coerce.number().min(1, { message: "Minimum is 1 GB" }).max(100, { message: "Maximum is 100 GB" }),
  reason: z.string().min(1, { message: "Please provide a reason" }),
});

function QuotaRequestModal({ open, onClose }) {
  // Local state
  const [loading, setLoading] = React.useState(false);

  // RTK Query hooks
  const [requestQuota] = useRequestQuotaIncreaseMutation();

  // Custom & shared hooks
  const { message } = App.useApp();

  const form = useForm({
    resolver: zodResolver(quotaSchema),
    defaultValues: {
      amount: 10,
      reason: "",
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
      setLoading(true);

      await requestQuota({ reason: values.reason, requested_bytes: values.amount * ByteMultipliers.GB }).unwrap();

      message.success("Quota request submitted successfully!");
      form.reset();
      setLoading(false);
      onClose();
    } catch (_err) {
      message.error("Validation failed");
      setLoading(false);
    }
  }

  function handleCancel() {
    form.reset();
    onClose();
  }

  // Render
  return (
    <Modal
      modalTitle="Request Quota Increase"
      open={open}
      handleSubmit={form.handleSubmit(handleOk)}
      handleCloseModal={handleCancel}
      btnLoading={loading}
      btnText="Submit Request"
    >
      <Form {...form}>
        <form id="quota-request-form" onSubmit={form.handleSubmit(handleOk)} className="space-y-4 pt-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Storage Needed (GB)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Increase</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Why do you need more storage?" className="resize-none" {...field} />
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

export default QuotaRequestModal;

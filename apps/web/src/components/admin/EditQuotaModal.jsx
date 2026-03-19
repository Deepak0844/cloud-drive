// React core & third-party libraries
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Services (RTK Query hooks)
import { useUpdateUserQuotaMutation } from "@services/api/adminApi";

// Constants
import { ByteMultipliers } from "@shared-constants/constants";

// Components
import Modal from "@components/common/Modal";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";
import { Input } from "@components/ui/input";

const quotaFormSchema = z.object({
  quota: z.coerce.number().min(1, "Quota must be at least 1 GB").max(1000, "Quota cannot exceed 1000 GB"),
});

function bytesToGB(bytes) {
  if (!bytes) return 0;
  return Number((bytes / ByteMultipliers.GB).toFixed(0));
}

function EditQuotaModal({ open, onClose, user }) {
  // RTK Query hooks
  const [updateUserQuota, { isLoading }] = useUpdateUserQuotaMutation();

  // Custom & shared hooks
  const form = useForm({
    resolver: zodResolver(quotaFormSchema),
    defaultValues: {
      quota: 0,
    },
  });

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (open && user) {
      form.reset({
        quota: bytesToGB(user.quota_bytes),
      });
    }
  }, [open, user, form]);

  // Event handlers
  async function handleUpdate(values) {
    try {
      const quotaBytes = values.quota * ByteMultipliers.GB;
      await updateUserQuota({ id: user._id, quota_bytes: quotaBytes }).unwrap();
      toast.success("Quota updated successfully");
      onClose();
    } catch (_error) {
      toast.error("Failed to update quota");
    }
  }

  // Render
  return (
    <Modal
      modalTitle={`Adjust Storage: ${user?.name || ""}`}
      open={open}
      handleSubmit={form.handleSubmit(handleUpdate)}
      handleCloseModal={onClose}
      btnLoading={isLoading}
      btnText="Update Quota"
    >
      <Form {...form}>
        <form id="edit-quota-form" onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4 pt-2">
          <FormField
            control={form.control}
            name="quota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Capacity (GB)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={1000} suffix="GB" {...field} />
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

export default EditQuotaModal;

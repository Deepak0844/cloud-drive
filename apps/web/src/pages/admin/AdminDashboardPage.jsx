import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  HourglassOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Tabs,
  Tag,
  Typography,
  message as antdMessage,
  Modal,
  Form,
  InputNumber,
  Space,
  Skeleton,
  Button as AntdButton,
} from "antd";
import { motion } from "framer-motion";
import React, { useState } from "react";

// api
import {
  useGetUsersQuery,
  useUpdateUserQuotaMutation,
  useUpdateUserStatusMutation,
  useGetAllQuotaRequestsQuery,
  useHandleQuotaRequestMutation,
  useRunStorageReanalysisMutation,
} from "@/store/api/adminApi";

// constants
import { UI_COLORS } from "@/constants/uiConstants";
import PageNames from "@/constants/pageNames";

// utils
import { formatBytes } from "@shared-utils/utils";

// components
import Table from "@shared-components/components/table";
import TableActionButton from "@shared-components/components/table-action-button";

const { Text, Title } = Typography;

function bytesToGB(bytes) {
  if (!bytes) return 0;
  // Use decimal (1000) for consistency with Google Drive standards
  return Number((bytes / (1000 * 1000 * 1000)).toFixed(0));
}

function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export default function AdminDashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("1");
  const [form] = Form.useForm();
  const [userPage, setUserPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const pageSize = 10;

  // API Queries
  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
  } = useGetUsersQuery({
    pg: userPage,
    ps: pageSize,
  });
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
  } = useGetAllQuotaRequestsQuery({
    pg: requestPage,
    ps: pageSize,
  });

  // API Mutations
  const [updateUserQuota] = useUpdateUserQuotaMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [handleQuotaRequest] = useHandleQuotaRequestMutation();
  const [runReanalysis, { isLoading: reanalyzing }] = useRunStorageReanalysisMutation();

  // Note: Filter out current user if returned in same page, but usually backend handles this or admin is fine to see themselves
  const users = usersData?.data || [];
  const requests = requestsData?.data || [];

  const userPagination = usersData?.pagination;
  const requestPagination = requestsData?.pagination;

  function handleEdit(user) {
    setEditingUser(user);
    const quotaGB = bytesToGB(user.quota_bytes);
    form.setFieldsValue({ quota: quotaGB });
    setIsModalOpen(true);
  }

  async function handleUpdate() {
    try {
      const values = await form.validateFields();
      const quotaBytes = values.quota * 1000 * 1000 * 1000;
      await updateUserQuota({ id: editingUser._id, quota_bytes: quotaBytes }).unwrap();
      antdMessage.success("Quota updated successfully");
      setIsModalOpen(false);
    } catch (_error) {
      antdMessage.error("Failed to update quota");
    }
  }

  async function handleUserStatusToggle(userId, isActive) {
    try {
      await updateUserStatus({ id: userId, is_active: isActive }).unwrap();
      antdMessage.success(`User has been ${isActive ? "enabled" : "disabled"}`);
    } catch (_err) {
      antdMessage.error("Failed to update user status");
    }
  }

  async function handleRequestStatus(id, status) {
    try {
      await handleQuotaRequest({ id, status }).unwrap();
      antdMessage.success(`Request ${status.toLowerCase()} successfully`);
    } catch (_err) {
      antdMessage.error("Failed to update quota request");
    }
  }

  async function handleSyncStorage(userId = null) {
    try {
      antdMessage.loading({
        content: userId ? "Re-analyzing user storage..." : "Re-analyzing all users storage...",
        key: "reanalyze",
      });
      await runReanalysis({ userId }).unwrap();
      antdMessage.success({
        content: userId ? "User storage re-analyzed successfully" : "All storage re-analyzed successfully",
        key: "reanalyze",
      });
    } catch (_err) {
      antdMessage.error({ content: "Storage re-analysis failed", key: "reanalyze" });
    }
  }

  const userColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <div className="flex items-center gap-2">
          <UserOutlined className="text-label-tertiary" />
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => <Tag color={UI_COLORS.ROLES[role] || "blue"}>{role}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Tag color={record.is_active ? "green" : "red"}>{record.is_active ? "Active" : "Disabled"}</Tag>
      ),
    },
    {
      title: "Storage Used",
      key: "usage",
      render: (_, record) => {
        if (record.role === "ADMIN") {
          return null;
        }

        const usedText = formatBytes(record.used_bytes);
        const totalText = formatBytes(record.quota_bytes);
        const percent = calculatePercentage(record.used_bytes, record.quota_bytes);

        return (
          <div>
            <Text>
              {usedText} / {totalText}
            </Text>
            <div className="text-xs text-label-secondary">{percent}% used</div>
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        record.role !== "ADMIN" && (
          <div className="flex gap-2">
            <TableActionButton icon={<EditOutlined />} onClick={() => handleEdit(record)} buttonText="Edit Quota" />
            <TableActionButton
              icon={<ReloadOutlined />}
              popconfirmTitle="Re-analyze storage for this user?"
              onConfirm={() => handleSyncStorage(record._id)}
              buttonText="Re-sync"
            />
            <TableActionButton
              danger={record.is_active}
              type={record.is_active ? "default" : "primary"}
              popconfirmTitle={`Are you sure you want to ${record.is_active ? "disable" : "enable"} this user?`}
              onConfirm={() => handleUserStatusToggle(record._id, !record.is_active)}
              buttonText={record.is_active ? "Disable" : "Enable"}
            />
          </div>
        ),
    },
  ];

  const quotaColumns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div>
          <Text strong>{record.user?.name}</Text>
          <div className="text-xs text-label-secondary">{record.user?.email}</div>
        </div>
      ),
    },
    {
      title: "Requested Amount",
      key: "amount",
      render: (_, record) => <Text>{formatBytes(record.requested_bytes)}</Text>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = UI_COLORS.STATUS.PENDING;
        let icon = <HourglassOutlined />;
        if (status === "APPROVED") {
          color = UI_COLORS.STATUS.APPROVED;
          icon = <CheckCircleOutlined />;
        }
        if (status === "REJECTED") {
          color = UI_COLORS.STATUS.REJECTED;
          icon = <CloseCircleOutlined />;
        }
        return (
          <Tag color={color} icon={icon}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        record.status === "PENDING" ? (
          <Space>
            <TableActionButton
              type="primary"
              icon={<CheckCircleOutlined />}
              popconfirmTitle="Approve storage request?"
              onConfirm={() => handleRequestStatus(record._id, "APPROVED")}
              buttonText="Approve"
            />
            <TableActionButton
              danger
              icon={<CloseCircleOutlined />}
              popconfirmTitle="Reject storage request?"
              onConfirm={() => handleRequestStatus(record._id, "REJECTED")}
              buttonText="Reject"
            />
          </Space>
        ) : null,
    },
  ];

  const items = [
    {
      key: "1",
      label: "User Management",
      children: usersLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="_id"
          className="bg-surface rounded-xl shadow-sm"
          loading={usersFetching}
          pagination={{
            current: userPage,
            pageSize: pageSize,
            total: userPagination?.totalItems || 0,
            onChange: (p) => setUserPage(p),
            showSizeChanger: false,
          }}
          scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        />
      ),
    },
    {
      key: "2",
      label: "Quota Requests",
      children: requestsLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Table
          columns={quotaColumns}
          dataSource={requests}
          rowKey="_id"
          className="bg-surface rounded-xl shadow-sm"
          loading={requestsFetching}
          pagination={{
            current: requestPage,
            pageSize: pageSize,
            total: requestPagination?.totalItems || 0,
            onChange: (p) => setRequestPage(p),
            showSizeChanger: false,
          }}
          scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-6 h-full flex flex-col"
    >
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0!">
            {PageNames.ADMIN}
          </Title>
          <Text type="secondary">Manage users and storage requests</Text>
        </div>
        <AntdButton
          icon={<ReloadOutlined />}
          loading={reanalyzing}
          onClick={() => handleSyncStorage()}
          className="rounded-xl font-bold h-10 border-primary text-primary hover:bg-primary-light"
        >
          Re-analyze All Storage
        </AntdButton>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} className="admin-tabs flex-1" />

      <Modal
        title={`Edit Quota for ${editingUser?.name}`}
        open={isModalOpen}
        onOk={handleUpdate}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="quota"
            label="Storage Quota (GB)"
            rules={[
              { required: true, message: "Please enter quota" },
              { type: "number", min: 1, max: 1000, message: "Quota must be between 1-1000 GB" },
            ]}
          >
            <InputNumber min={1} max={1000} step={1} className="w-full" precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}

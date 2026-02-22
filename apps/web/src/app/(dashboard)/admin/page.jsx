// external
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  HourglassOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Form, InputNumber, Modal, Space, Tabs, Tag, Typography, message } from "antd";
import React, { useState } from "react";

// components
import Table from "@shared-components/components/table";
import TableActionButton from "@shared-components/components/table-action-button";
// constants
import { MOCK_DATA, UI_COLORS } from "@shared-constants/constants";
// utils
import { formatBytes } from "@shared-utils/utils/format";

const { Text, Title } = Typography;

function bytesToGB(bytes) {
  if (!bytes) return 0;
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(0));
}

function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export default function AdminPage() {
  const [users, setUsers] = useState(MOCK_DATA.USERS);
  const [requests, setRequests] = useState(MOCK_DATA.REQUESTS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("1");
  const [form] = Form.useForm();

  function handleEdit(user) {
    setEditingUser(user);
    const quotaGB = bytesToGB(user.quota_bytes);
    form.setFieldsValue({ quota: quotaGB });
    setIsModalOpen(true);
  }

  async function handleUpdate() {
    try {
      const values = await form.validateFields();
      const quotaBytes = values.quota * 1024 * 1024 * 1024;

      setUsers(users.map((u) => (u._id === editingUser._id ? { ...u, quota_bytes: quotaBytes } : u)));
      message.success("Quota updated successfully");
      setIsModalOpen(false);
    } catch (_error) {
      message.error("Validation failed");
    }
  }

  function handleUserStatusToggle(userId, isActive) {
    setUsers(users.map((u) => (u._id === userId ? { ...u, is_active: isActive } : u)));
    message.success(`User has been ${isActive ? "enabled" : "disabled"}`);
  }

  function handleRequestStatus(id, status) {
    setRequests(requests.map((r) => (r._id === id ? { ...r, status } : r)));
    message.success(`Request ${status.toLowerCase()} successfully`);
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
          return <Text type="secondary">--</Text>;
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
      children: (
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="_id"
          className="bg-surface rounded-xl shadow-sm"
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        />
      ),
    },
    {
      key: "2",
      label: "Quota Requests",
      children: (
        <Table
          columns={quotaColumns}
          dataSource={requests}
          rowKey="_id"
          className="bg-surface rounded-xl shadow-sm"
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        />
      ),
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 shrink-0">
        <Title level={2}>Admin Dashboard</Title>
        <Text type="secondary">Manage users and storage requests</Text>
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
    </div>
  );
}

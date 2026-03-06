import React, { useState, useEffect } from "react";
import { Modal, Typography, Spin, App } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import HttpClientFactory from "@/utils/httpClientFactory";
import Button from "@shared-components/components/button";

const { Text } = Typography;

export default function FilePreviewModal({ file, open, onClose }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  // Derive resource endpoints via our authenticated proxy helper
  useEffect(() => {
    if (!open || !file) {
      setPreviewSrc(null);
      setLoading(true);
      setHasError(false);
      return;
    }

    try {
      setHasError(false);
      const fileId = file.id || file._id;
      const type = file.category || file.type;

      let url = "";
      const cacheBust = `?_t=${Date.now()}`;

      if (type === "audio") {
        url = `/api/v1/files/${fileId}/stream${cacheBust}`;
      } else {
        // Video and Images natively stream through the Express preview handler
        url = `/api/v1/files/${fileId}/preview${cacheBust}`;
      }

      setPreviewSrc(url);
      setLoading(false); // Let native HTML tags handle progressive load indication
    } catch (err) {
      console.error("Failed to construct preview URL:", err);
      setHasError(true);
      setLoading(false);
    }

    // Cleanup blob URLs to prevent memory leaks (if any are still around from other features)
    return () => {
      if (previewSrc && previewSrc.startsWith("blob:")) {
        URL.revokeObjectURL(previewSrc);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, open]);

  function handleDownload() {
    if (!file) return;
    const httpClient = HttpClientFactory.getInstance();

    message.loading({ content: "Preparing download...", key: "downloading" });

    httpClient
      .get(`/api/v1/files/${file.id || file._id}/download`, {}, null, { responseType: "blob" })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success({ content: "Download complete", key: "downloading" });
      })
      .catch(() => {
        message.error({ content: "Download failed", key: "downloading" });
      });
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70">
          <Spin size="large" />
          <Text className="text-label-tertiary">Loading preview...</Text>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Text className="text-xl font-bold text-label">Preview Unavailable</Text>
          <Text className="text-label-secondary text-center max-w-xs mb-4">
            We couldn&apos;t generate a preview for this file type, or the file may be corrupted.
          </Text>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            className="font-bold rounded-xl h-10"
          >
            Download File Instead
          </Button>
        </div>
      );
    }

    const type = file?.type || file?.category;

    if (type === "video") {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center">
          <video
            controls
            autoPlay
            src={previewSrc}
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={() => {
              // If direct /preview fails (non-native format), retry via /stream (on-the-fly transcode)
              if (previewSrc && !previewSrc.includes("/stream")) {
                const fileId = file.id || file._id;
                setPreviewSrc(`/api/v1/files/${fileId}/stream?_t=${Date.now()}`);
              } else {
                setHasError(true);
              }
            }}
          >
            <track kind="captions" srcLang="en" label="English" />
          </video>
        </div>
      );
    }

    if (type === "audio") {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-surface-dim rounded-2xl gap-8">
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <svg
              className="w-16 h-16 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <audio controls autoPlay src={previewSrc} className="w-full max-w-md" onError={() => setHasError(true)}>
            <track kind="captions" srcLang="en" label="English" />
          </audio>
        </div>
      );
    }

    if (type === "image" || file?.mime_type?.startsWith("image/")) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-checkered flex items-center justify-center">
          <img
            src={previewSrc}
            alt={file?.name}
            className="max-w-full max-h-[75vh] object-contain shadow-sm"
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    // PDF Fallback
    if (type === "pdf" || file?.mime_type === "application/pdf") {
      return (
        <div className="w-full h-[75vh] rounded-2xl overflow-hidden shadow-inner border border-line">
          <object data={previewSrc} type="application/pdf" className="w-full h-full">
            <div className="flex flex-col items-center justify-center h-full p-20 gap-4">
              <Text className="text-xl font-bold text-label">Browser PDF Viewer Not Supported</Text>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                className="font-bold rounded-xl h-10"
              >
                Download PDF
              </Button>
            </div>
          </object>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Text className="text-xl font-bold text-label">No Preview Available</Text>
        <Text className="text-label-secondary">Previews are not supported for .{file?.extension || "this"} files.</Text>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          className="font-bold rounded-xl h-10 mt-2"
        >
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={1000}
      title={
        <div className="flex items-center gap-3 pr-8">
          <Text className="font-bold truncate text-lg max-w-lg">{file?.name}</Text>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            size="small"
            onClick={handleDownload}
            className="text-primary hover:bg-primary-light rounded-lg font-semibold"
          >
            Download
          </Button>
        </div>
      }
      className="premium-modal"
      styles={{
        body: { padding: "20px" },
        header: { marginBottom: 0, padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" },
      }}
    >
      {renderContent()}
    </Modal>
  );
}

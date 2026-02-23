import { DeleteOutlined, HomeOutlined, RestOutlined } from "@ant-design/icons";
import { Breadcrumb } from "antd";
import { motion } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import Button from "@shared-components/components/button";

function TrashPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-label mb-2">{PageNames.TRASH}</h1>
          <Breadcrumb
            items={[
              {
                title: (
                  <Link to={PageUrls.DashboardPage}>
                    <HomeOutlined /> {PageNames.MY_FILES}
                  </Link>
                ),
              },
              { title: PageNames.TRASH },
            ]}
          />
        </div>
        <Button danger type="primary" icon={<RestOutlined />} className="rounded-xl h-10 shadow-sm">
          Empty Trash
        </Button>
      </div>

      <div className="bg-surface rounded-3xl border border-line shadow-sm flex flex-col items-center justify-center py-24 px-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
          className="w-24 h-24 rounded-full bg-danger-light flex items-center justify-center mb-6"
        >
          <DeleteOutlined style={{ fontSize: "2.5rem", color: "var(--danger)" }} />
        </motion.div>
        <h2 className="text-xl font-semibold text-label mb-2">Your trash is empty</h2>
        <p className="text-sm text-label-tertiary text-center max-w-xs leading-relaxed">
          Items you delete will appear here and be permanently removed after 30 days.
        </p>
      </div>
    </motion.div>
  );
}

export default TrashPage;

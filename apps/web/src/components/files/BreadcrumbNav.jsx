// React core & third-party libraries
import React from "react";
import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";

// App-local constants
import PageNames from "@constants/pageNames";

export default function BreadcrumbNav({ breadcrumbs, setCurrentFolderId }) {
  // Derived / computed variables
  const breadcrumbsList = [
    {
      title: (
        <span
          onClick={() => setCurrentFolderId("root")}
          onKeyDown={(e) => e.key === "Enter" && setCurrentFolderId("root")}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 text-primary font-semibold text-xs cursor-pointer"
        >
          <HomeOutlined className="text-[10px]" /> <span>{PageNames.MY_FILES}</span>
        </span>
      ),
    },
    ...(breadcrumbs || []).map((bc) => ({
      title: (
        <span
          onClick={() => setCurrentFolderId(bc.id)}
          onKeyDown={(e) => e.key === "Enter" && setCurrentFolderId(bc.id)}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 text-label font-medium text-xs cursor-pointer hover:text-primary transition-colors"
        >
          <span>{bc.name}</span>
        </span>
      ),
    })),
  ];

  // Render
  return <Breadcrumb separator={<span className="text-label-tertiary">/</span>} items={breadcrumbsList} />;
}

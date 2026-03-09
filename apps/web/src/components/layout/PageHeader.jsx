import React from "react";
import { Breadcrumb } from "antd";

function PageHeader({ title, icon = null, breadcrumbItems = [], breadcrumbNode = null, rightContent = null }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-label tracking-tight flex items-center gap-3 m-0">
          {icon}
          <span>{title}</span>
        </h1>
        {breadcrumbNode || (
          <Breadcrumb
            separator={<span className="text-label-tertiary">/</span>}
            items={breadcrumbItems.map((item) => ({
              title: item.title,
            }))}
          />
        )}
      </div>

      {rightContent ? <div className="flex flex-wrap items-center gap-3">{rightContent}</div> : null}
    </div>
  );
}

export default PageHeader;

import React, { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

function PageHeader({ title, icon = null, breadcrumbItems = [], breadcrumbNode = null, rightContent = null }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-label tracking-tight flex items-center gap-3 m-0">
          {icon}
          <span>{title}</span>
        </h1>
        {breadcrumbNode ||
          (breadcrumbItems.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <Fragment key={index}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-bold text-label-secondary">{item.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink className="text-label-tertiary">{item.title}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          ))}
      </div>

      {rightContent ? <div className="flex flex-wrap items-center gap-3">{rightContent}</div> : null}
    </div>
  );
}

export default PageHeader;

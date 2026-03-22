import React, { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

function PageHeader({ breadcrumbItems = [], breadcrumbNode = null, rightContent = null }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
      <div className="flex flex-col gap-1.5 mt-2">
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

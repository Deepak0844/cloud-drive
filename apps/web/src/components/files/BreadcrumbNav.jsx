// React core & third-party libraries
import React from "react";
import { Home } from "lucide-react";

// App-local constants
import PageNames from "@constants/pageNames";
import { ROOT_FOLDER_ID } from "@constants/serviceUrls";

// Components
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

export default function BreadcrumbNav({ breadcrumbs, setCurrentFolderId }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            asChild
            className="flex items-center gap-2 cursor-pointer text-primary font-bold hover:text-primary/80 transition-all"
            onClick={() => setCurrentFolderId(ROOT_FOLDER_ID)}
          >
            <div className="flex items-center gap-2">
              <Home size={14} className="stroke-[2.5]" />
              <span>{PageNames.MY_FILES}</span>
            </div>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs && breadcrumbs.length > 0 && <BreadcrumbSeparator />}

        {breadcrumbs?.map((bc, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={bc.id}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-bold text-label">{bc.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer text-label-secondary font-medium hover:text-primary transition-all"
                    onClick={() => setCurrentFolderId(bc.id)}
                  >
                    {bc.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

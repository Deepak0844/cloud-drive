import React from "react";
import { Button as ShadcnButton } from "../../../../apps/web/src/components/ui/button";

/**
 * Temporary bridge wrapper to route `@shared-components/components/button`
 * imports to the new shadcn button located in apps/web.
 * This allows incremental migration of pages without breaking the build.
 */
export default function Button({ children, type, danger, ...props }) {
  // Map AntD props to Shadcn variants for backwards compatibility
  let variant = "default";

  if (type === "text" || type === "link") variant = "ghost";
  if (type === "dashed" || type === "default") variant = "outline";
  if (danger) variant = "danger"; // custom aurora danger variant

  return (
    <ShadcnButton variant={variant} {...props}>
      {children}
    </ShadcnButton>
  );
}

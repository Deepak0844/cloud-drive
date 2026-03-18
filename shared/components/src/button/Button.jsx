import React from "react";
import { Button as ShadcnButton } from "../../../../apps/web/src/components/ui/button";

/**
 * Temporary bridge wrapper to route `@shared-components/components/button`
 * imports to the new shadcn button located in apps/web.
 * This allows incremental migration of pages without breaking the build.
 */
export default function Button({ children, type = "button", variant = "default", ...props }) {
  return (
    <ShadcnButton variant={variant} type={type} {...props}>
      {children}
    </ShadcnButton>
  );
}

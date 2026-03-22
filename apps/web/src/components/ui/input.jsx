import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

// Utils
import { cn } from "@lib/utils";

function Input({ className, type, prefix, suffix, ...props }) {
  const inputElem = (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
        prefix ? "pl-9" : "",
        suffix ? "pr-9" : ""
      )}
      {...props}
    />
  );

  if (!prefix && !suffix) {
    return inputElem;
  }

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <div className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none z-10">
          {prefix}
        </div>
      )}
      {inputElem}
      {suffix && (
        <div className="absolute right-3 flex items-center justify-center text-muted-foreground pointer-events-none z-10">
          {suffix}
        </div>
      )}
    </div>
  );
}

export { Input };

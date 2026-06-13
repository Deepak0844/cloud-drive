import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@lib/utils";
import { buttonVariants } from "./variants/button-variants";

// export { buttonVariants } - Removed to fix Fast Refresh warning

export function Button({ className, variant = "default", size = "default", loading, fullWidth, ...props }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), fullWidth && "w-full")}
      disabled={loading || props.disabled}
      {...props}
    />
  );
}

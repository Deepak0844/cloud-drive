import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

// Utils
import { cn } from "@lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ── shadcn defaults ──────────────────────────────────
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",

        // ── Aurora variants ──────────────────────────────────
        // Gradient violet→cyan — primary CTA (auth pages, upload, etc.)
        aurora: "bg-gradient-aurora text-white shadow-primary hover:opacity-90 hover:shadow-aurora active:opacity-95",

        // Solid danger — Empty Trash, Delete actions
        danger:
          "bg-danger text-white hover:bg-danger-dark shadow-[0_4px_14px_var(--_red-35)] hover:shadow-[0_6px_20px_var(--_red-35)]",

        // Solid success — Approve, Save confirmed actions
        success: "bg-success text-white hover:bg-success-dark",

        // Amber warning — Storage alerts, overwrite prompts
        warning: "bg-warning text-[#1c1007] hover:bg-warning-dark",

        // Glass ghost — subtle toolbar buttons on dark bg
        "glass-ghost":
          "bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]",
        lg: "h-9 gap-1.5 px-3",
        xl: "h-11 gap-2 px-5 text-base font-semibold",
        // Full-pill shape — used in auth CTAs and dialogs
        pill: "h-11 gap-2 px-6 rounded-full text-base font-semibold",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)]",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)]",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant = "default", size = "default", ...props }) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };

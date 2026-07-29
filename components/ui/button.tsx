import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-all duration-150 ease-standard disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-glow hover:brightness-110 active:brightness-95",
        signal:
          "bg-signal text-signal-foreground shadow-sm hover:shadow-glow-signal hover:brightness-110 active:brightness-95",
        secondary: "bg-secondary text-secondary-foreground border border-border-strong hover:bg-accent",
        outline: "border border-border-strong bg-transparent hover:bg-surface-elevated hover:border-primary/40",
        ghost: "bg-transparent hover:bg-surface-elevated",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "bg-transparent underline-offset-4 hover:underline text-primary p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base rounded-lg",
        icon: "h-10 w-10 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      // Slot requires exactly one React element child — no conditional
      // siblings (like the loading spinner below), and no button-only
      // props like `disabled`/`aria-busy` forwarded onto whatever element
      // the caller passed in (often a Next.js <Link>).
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

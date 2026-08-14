import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground border border-primary hover:brightness-95 active:brightness-90 focus-visible:ring-ring/45 shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent hover:text-accent-foreground active:bg-muted focus-visible:ring-ring/40 shadow-none",
        ghost:
          "bg-transparent text-info border border-border hover:bg-accent hover:text-info hover:border-info/40 active:bg-muted focus-visible:ring-info/30 shadow-none",
        destructive:
          "bg-transparent text-destructive border border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive active:bg-destructive/20 focus-visible:ring-destructive/30 shadow-none",
        link: "text-info underline-offset-4 hover:underline hover:text-info/80 border-0 bg-transparent shadow-none p-0 h-auto",
        /** @deprecated Use `primary` */
        default:
          "bg-primary text-primary-foreground border border-primary hover:brightness-95 active:brightness-90 focus-visible:ring-ring/45 shadow-none",
        /** @deprecated Use `secondary` */
        outline:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent hover:text-accent-foreground active:bg-muted focus-visible:ring-ring/40 shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4",
        lg: "h-11 px-6",
        icon: "h-10 w-10 p-0 rounded-xl",
        table: "h-8 px-3 text-xs rounded-lg gap-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

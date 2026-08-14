"use client"

import { Button } from "@/components/ui/button"

/**
 * @param {{
 *   variant?: import("@/lib/uploadButtonStyles").UploadButtonVariant;
 *   size?: import("@/lib/uploadButtonStyles").UploadButtonSize;
 *   asChild?: boolean;
 *   className?: string;
 *   children?: import("react").ReactNode;
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function DashboardButton({
  variant = "secondary",
  size = "md",
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}) {
  const mappedVariant =
    variant === "primary"
      ? "primary"
      : variant === "secondary"
        ? "secondary"
        : variant === "danger"
          ? "destructive"
          : variant === "outline"
            ? "secondary"
            : "ghost"

  const mappedSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md"

  return (
    <Button
      type={type}
      variant={mappedVariant}
      size={mappedSize}
      asChild={asChild}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}

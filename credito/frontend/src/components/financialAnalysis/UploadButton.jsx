"use client"

import { Button } from "@/components/ui/button"

/**
 * @param {{
 *   variant?: import("@/lib/uploadButtonStyles").UploadButtonVariant;
 *   size?: import("@/lib/uploadButtonStyles").UploadButtonSize | "table";
 *   className?: string;
 *   children?: import("react").ReactNode;
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function UploadButton({
  variant = "secondary",
  size = "sm",
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

  const mappedSize =
    size === "lg" ? "lg" : size === "md" ? "md" : size === "icon" ? "icon" : "sm"

  return (
    <Button
      type={type}
      variant={mappedVariant}
      size={mappedSize}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}

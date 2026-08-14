import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** @typedef {"primary" | "secondary" | "outline" | "nav" | "danger"} UploadButtonVariant */
/** @typedef {"sm" | "md" | "lg" | "table" | "icon"} UploadButtonSize */

/** @type {Record<UploadButtonVariant, import("@/components/ui/button").buttonVariants extends (...args: infer A) => string ? never : "primary" | "secondary" | "ghost" | "destructive">} */
const VARIANT_MAP = {
  primary: "primary",
  secondary: "secondary",
  outline: "secondary",
  nav: "ghost",
  danger: "destructive",
}

/** @type {Record<string, "default" | "sm" | "md" | "lg" | "icon" | "table">} */
const SIZE_MAP = {
  sm: "sm",
  md: "md",
  lg: "lg",
  table: "table",
  icon: "icon",
}

/**
 * @param {UploadButtonVariant} variant
 * @param {UploadButtonSize | "table"} [size]
 * @param {string} [className]
 */
export function uploadButtonClass(variant, size = "sm", className) {
  return cn(
    buttonVariants({
      variant: VARIANT_MAP[variant] ?? "secondary",
      size: SIZE_MAP[size] ?? "sm",
    }),
    className
  )
}

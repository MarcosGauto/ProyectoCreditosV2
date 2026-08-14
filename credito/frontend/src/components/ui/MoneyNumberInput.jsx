"use client"

import { Input } from "@/components/ui/input"
import {
  fromNumberInputChange,
  normalizeMoneyInputOnBlur,
  toNumberInputValue,
} from "@/lib/money"

/**
 * Input monetario con 2 decimales (type=number, step=0.01).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   allowNegative?: boolean;
 *   className?: string;
 *   placeholder?: string;
 *   onBlur?: (event: import("react").FocusEvent<HTMLInputElement>) => void;
 *   onKeyDown?: (event: import("react").KeyboardEvent<HTMLInputElement>) => void;
 *   inputRef?: (el: HTMLInputElement | null) => void;
 *   "data-field"?: string;
 *   readOnly?: boolean;
 * }} props
 */
export function MoneyNumberInput({
  value,
  onChange,
  allowNegative = false,
  className = "",
  placeholder = "0",
  onBlur,
  onKeyDown,
  inputRef,
  readOnly = false,
  ...rest
}) {
  return (
    <Input
      ref={inputRef}
      type="number"
      step="0.01"
      min={allowNegative ? undefined : 0}
      readOnly={readOnly}
      inputMode="decimal"
      value={toNumberInputValue(value)}
      onChange={(event) => {
        const next = fromNumberInputChange(event.target.value)
        if (next !== null) {
          onChange(next)
        }
      }}
      onBlur={(event) => {
        onChange(normalizeMoneyInputOnBlur(value))
        onBlur?.(event)
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  )
}

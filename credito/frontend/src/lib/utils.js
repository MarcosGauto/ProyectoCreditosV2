import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatMoney } from "@/lib/money"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
    return `$ ${formatMoney(amount)}`
}

"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

/**
 * @param {{
 *   cuit: string;
 *   razonSocial: string;
 *   onCuitChange: (value: string) => void;
 *   onRazonSocialChange: (value: string) => void;
 * }} props
 */
export function DocumentacionComercialSearch({
  cuit,
  razonSocial,
  onCuitChange,
  onRazonSocialChange,
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Buscar por CUIT</span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={cuit}
            onChange={(e) => onCuitChange(e.target.value)}
            placeholder="Ej. 30-71017326-1"
            className="border-border bg-card pl-9 text-foreground placeholder:text-muted-foreground"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Buscar por Razón Social
        </span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={razonSocial}
            onChange={(e) => onRazonSocialChange(e.target.value)}
            placeholder="Nombre del cliente"
            className="border-border bg-card pl-9 text-foreground placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </div>
      </label>
    </div>
  )
}

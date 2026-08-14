"use client"

import { Loader2, RefreshCw } from "lucide-react"

import { Input } from "@/components/ui/input"
import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { formatCoeficienteIpcDisplay } from "@/lib/balancePrequalificationPreview"
import { isAutomaticInflation } from "@/lib/inflation/inflationManualSync"

/**
 * @param {{
 *   inflation: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 *   inflationLoading?: boolean;
 *   inflationError?: string;
 *   manualCoeficienteIpc: string;
 *   onManualCoeficienteIpcChange: (value: string) => void;
 *   onRecalculate: () => void;
 *   recalculateDisabled?: boolean;
 * }} props
 */
export function BalanceInflationPanel({
  inflation,
  inflationLoading = false,
  inflationError = "",
  manualCoeficienteIpc,
  onManualCoeficienteIpcChange,
  onRecalculate,
  recalculateDisabled = false,
}) {
  const isAutomatic = isAutomaticInflation(inflation)
  const showManualInput = !isAutomatic && !inflationLoading

  return (
    <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/5 px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
          Actualización por inflación (IPC)
        </p>
        {inflation && !inflationLoading && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isAutomatic
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {isAutomatic ? "Automático" : "Manual"}
          </span>
        )}
      </div>

      {inflationLoading && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Calculando factor...
        </p>
      )}

      {inflationError && !inflationLoading && (
        <p className="text-xs text-yellow-300">{inflationError}</p>
      )}

      {isAutomatic && inflation && !inflationLoading && (
        <>
          <p className="text-[11px] text-green-300/90">Calculado automáticamente</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Coeficiente IPC</dt>
              <dd className="font-semibold text-blue-200 tabular-nums">
                {formatCoeficienteIpcDisplay(inflation.factorInflacion)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IPC origen</dt>
              <dd className="text-foreground/80">{inflation.fechaIPCOrigen}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IPC destino (hoy)</dt>
              <dd className="text-foreground/80">{inflation.fechaIPCDestino}</dd>
            </div>
          </dl>
        </>
      )}

      {showManualInput && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Ingresá el coeficiente IPC multiplicador (mismo valor que Excel), ej.{" "}
            <span className="text-foreground/80">3,762</span> o{" "}
            <span className="text-foreground/80">8,110872</span>.
          </p>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Coeficiente IPC
            </span>
            <Input
              inputMode="decimal"
              value={manualCoeficienteIpc}
              onChange={(e) => onManualCoeficienteIpcChange(e.target.value)}
              placeholder="3,762"
              className="h-10 border-border bg-background/40 text-foreground tabular-nums"
            />
          </label>
          {inflation && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Vista previa: coeficiente{" "}
              {formatCoeficienteIpcDisplay(inflation.factorInflacion)}
            </p>
          )}
        </div>
      )}

      <UploadButton
        variant="secondary"
        size="sm"
        disabled={recalculateDisabled || inflationLoading}
        onClick={onRecalculate}
      >
        {inflationLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Recalcular IPC
      </UploadButton>
    </div>
  )
}

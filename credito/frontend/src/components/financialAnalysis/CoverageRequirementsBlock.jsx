"use client"

import {
  getResultadoCoberturaBadgeClass,
  getResultadoFinalDisplayEmoji,
  TIPO_OPERACION_OPTIONS,
} from "@/lib/coverageRequirements"

/**
 * @param {{
 *   decision: import("@/lib/coverageRequirements").CoverageDecision;
 *   tipoOperacion: string;
 *   onTipoOperacionChange: (value: string) => void;
 *   fechaInicioActividadInput: string;
 *   onFechaInicioActividadChange: (value: string) => void;
 *   facturasAlContado: boolean | null;
 *   onFacturasAlContadoChange: (value: boolean) => void;
 * }} props
 */
export function CoverageRequirementsBlock({
  decision,
  tipoOperacion,
  onTipoOperacionChange,
  fechaInicioActividadInput,
  onFechaInicioActividadChange,
  facturasAlContado,
  onFacturasAlContadoChange,
}) {
  const resultadoBadge = getResultadoCoberturaBadgeClass(
    decision.resultadoCobertura
  )
  const emoji = getResultadoFinalDisplayEmoji(decision.resultadoCobertura)

  return (
    <div className="rounded-2xl border border-border bg-muted px-4 py-4 mb-5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Decisión / Cobertura
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="tipo-operacion-select"
            className="text-xs text-muted-foreground mb-1 block"
          >
            Tipo de operación
          </label>
          <select
            id="tipo-operacion-select"
            value={tipoOperacion}
            onChange={(e) => onTipoOperacionChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            {TIPO_OPERACION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="fecha-inicio-actividad"
            className="text-xs text-muted-foreground mb-1 block"
          >
            Fecha de inicio de actividad (razón social)
          </label>
          <input
            id="fecha-inicio-actividad"
            type="date"
            value={fechaInicioActividadInput}
            onChange={(e) => onFechaInicioActividadChange(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 "
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Antigüedad de la razón social:{" "}
            <span className="text-foreground/80 font-medium tabular-nums">
              {decision.antiguedadAnios != null
                ? `${decision.antiguedadAnios} año${decision.antiguedadAnios === 1 ? "" : "s"}`
                : "—"}
            </span>
            {decision.antiguedadAnios != null && (
              <span className="text-muted-foreground">
                {" "}
                ({decision.requisitosCobertura.antiguedad ? "cumple" : "no cumple"}{" "}
                requisito de 2 años)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Facturas al contado
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onFacturasAlContadoChange(true)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              facturasAlContado === true
                ? "border-green-500/50 bg-green-500/20 text-green-200"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onFacturasAlContadoChange(false)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              facturasAlContado === false
                ? "border-red-500/50 bg-red-500/20 text-red-200"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <div
        className={`rounded-2xl border-2 px-5 py-4 text-center ${resultadoBadge}`}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70 mb-2">
          Resultado de cobertura
        </p>
        <p className="text-xl font-black tracking-wide">
          {emoji} {decision.resultadoCoberturaLabel}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Requisitos
        </p>
        <ul className="space-y-1.5">
          {decision.checklist.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span aria-hidden>{item.cumple ? "✅" : "❌"}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {decision.motivosExclusion.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-red-300 mb-1">Motivos</p>
          <ul className="text-xs text-red-200/90 space-y-0.5 list-disc list-inside">
            {decision.motivosExclusion.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

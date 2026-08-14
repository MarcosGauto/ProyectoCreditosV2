"use client"

import { cn } from "@/lib/utils"

const LEVEL = {
  alert: "border-danger/35 bg-danger/10 text-danger",
  review: "border-warning/30 bg-warning/10 text-warning",
  ok: "border-success/30 bg-success/10 text-success",
}

const EMOJI = { alert: "🔴", review: "🟡", ok: "🟢" }

/**
 * Hallazgos objetivos + escenario informativo (sin veredicto de aprobación).
 *
 * @param {{
 *   alerts: Array<{ id: string; level: string; title: string }>;
 *   escenario: {
 *     ready: boolean;
 *     disponibleReal: string;
 *     limiteConocidoLabel: string;
 *     chequeLabel: string;
 *     impactoEstimado: string | null;
 *     superaLimite: boolean | null;
 *     nota: string;
 *   };
 * }} props
 */
export function RevisionRapidaAlerts({ alerts, escenario }) {
  return (
    <section className="min-w-0 space-y-3">
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Hallazgos de la consulta
        </p>
        <p className="mb-2 text-[10px] text-muted-foreground">
          Evidencia objetiva · no aprueba ni rechaza operaciones
        </p>
        <ul className="space-y-1.5">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-medium",
                LEVEL[a.level] ?? LEVEL.review
              )}
            >
              {EMOJI[a.level] ?? "🟡"} {a.title}
            </li>
          ))}
        </ul>
      </div>

      {escenario.ready ? (
        <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/[0.04] p-3 sm:p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700/80 dark:text-sky-400/80">
            Escenario informativo
          </p>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">
                Disponible real
              </dt>
              <dd className="font-medium text-foreground/80">
                {escenario.disponibleReal}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">
                Límite conocido
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {escenario.limiteConocidoLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">
                Cheque ingresado
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {escenario.chequeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">
                Relación vs límite conocido
              </dt>
              <dd className="font-medium text-sky-700 dark:text-sky-200">
                {escenario.impactoEstimado ?? "—"}
                {escenario.superaLimite === true
                  ? " · Supera límite conocido"
                  : escenario.superaLimite === false
                    ? " · Dentro del límite conocido"
                    : ""}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground">{escenario.nota}</p>
        </div>
      ) : null}
    </section>
  )
}

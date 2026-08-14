"use client";

import { Building2, Loader2 } from "lucide-react";

import {
  buildComercialEmpresasCards,
  getEmpresasVigenciaDesde,
  PYMENACION_COMERCIAL_AVISO,
} from "@/lib/coeficientes/coeficientesEmpresasModel";

const sectionTitleClass =
  "text-sm font-bold uppercase tracking-wider text-red-400 mb-3";

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return (
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatVigencia(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * @param {{
 *   productoLabel: string;
 *   lineaNombre: string;
 *   plazo: string | null;
 *   tna: number;
 *   comision: number;
 * }} props
 */
function EmpresaFinanciacionCard({
  productoLabel,
  lineaNombre,
  plazo,
  tna,
  comision,
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 h-full transition hover:border-zinc-600">
      <div className="space-y-1">
        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
          {productoLabel}
        </h3>
        <p className="text-sm text-muted-foreground">{lineaNombre}</p>
      </div>

      <dl className="space-y-2 text-sm mt-auto">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">TNA</dt>
          <dd className="text-red-300 font-semibold tabular-nums">{formatPct(tna)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Comisión</dt>
          <dd className="text-amber-300/90 font-semibold tabular-nums">
            {formatPct(comision)}
          </dd>
        </div>
        {plazo ? (
          <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-border">
            <dt className="text-muted-foreground">Plazo</dt>
            <dd className="text-foreground/80 font-medium">{plazo}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

/**
 * @param {{
 *   tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   financiaciones: import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacion[];
 *   loading?: boolean;
 * }} props
 */
export function FinanciamientoEmpresasSection({
  tarjetas,
  financiaciones,
  loading = false,
}) {
  const cards = buildComercialEmpresasCards(tarjetas, financiaciones);
  const showPymenacionAviso = cards.some((c) => c.productoCodigo === "PYMENACION");
  const vigenciaDesde = getEmpresasVigenciaDesde(
    financiaciones,
    cards.map((c) => c.productoCodigo)
  );

  if (!loading && cards.length === 0) {
    return null;
  }

  return (
    <section className="pt-8 border-t border-border space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-red-400 shrink-0" />
        <h2 className={sectionTitleClass + " mb-0"}>Financiamiento Empresas</h2>
      </div>

      <p className="text-xs text-muted-foreground max-w-3xl">
        Líneas de financiación para empresas, independientes de las tarjetas de
        consumo. Solo se muestran productos activos.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Cargando financiamiento empresas…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {cards.map((card) => (
              <EmpresaFinanciacionCard
                key={card.key}
                productoLabel={card.productoLabel}
                lineaNombre={card.lineaNombre}
                plazo={card.plazo}
                tna={card.tna}
                comision={card.comision}
              />
            ))}
          </div>

          {showPymenacionAviso && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1">
                Pymenación
              </p>
              <p className="text-sm text-amber-100/90 leading-relaxed">
                {PYMENACION_COMERCIAL_AVISO}
              </p>
            </div>
          )}

          {vigenciaDesde && (
            <p className="text-xs text-muted-foreground text-right pt-1">
              Información vigente desde el {formatVigencia(vigenciaDesde)}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

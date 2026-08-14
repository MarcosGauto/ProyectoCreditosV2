"use client"

import Link from "next/link"

/**
 * @param {{
 *   header: {
 *     razonSocial: string;
 *     cuit: string;
 *     estado: string;
 *     ultimaConsultaBcra: string;
 *   };
 *   cuit: string;
 *   empresaExists: boolean;
 *   bcraError?: string | null;
 * }} props
 */
export function RevisionRapidaHeader({
  header,
  cuit,
  empresaExists,
  bcraError = null,
}) {
  return (
    <header className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cliente
          </p>
          <h2
            className="truncate text-xl font-black tracking-tight text-foreground sm:text-2xl"
            title={header.razonSocial}
          >
            {header.razonSocial}
          </h2>
          <p className="mt-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:text-sm">
            CUIT {header.cuit}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2 sm:gap-3">
            <div className="min-w-0">
              <dt className="uppercase tracking-wide text-muted-foreground">
                Estado
              </dt>
              <dd className="truncate text-foreground/80">{header.estado}</dd>
            </div>
            <div className="min-w-0">
              <dt className="uppercase tracking-wide text-muted-foreground">
                Última consulta BCRA
              </dt>
              <dd className="truncate text-foreground/80">
                {header.ultimaConsultaBcra}
              </dd>
            </div>
          </dl>
        </div>
        {empresaExists ? (
          <Link
            href={`/dashboard/analysis/${cuit}`}
            className="shrink-0 text-[11px] font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Análisis completo →
          </Link>
        ) : (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
            Sin documento en empresas
          </span>
        )}
      </div>
      {bcraError ? (
        <p className="mt-2 text-[11px] text-amber-700/90 dark:text-amber-400/90">
          BCRA live: {bcraError}. Se muestran datos almacenados si existen.
        </p>
      ) : null}
    </header>
  )
}

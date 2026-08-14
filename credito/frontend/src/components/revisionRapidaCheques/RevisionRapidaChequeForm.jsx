"use client"

const INPUT =
  "w-full min-w-0 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"

/**
 * Formulario local del cheque a revisar (no se persiste).
 *
 * @param {{
 *   values: {
 *     importe: string;
 *     vencimiento: string;
 *     tipo: string;
 *     banco: string;
 *   };
 *   onChange: (patch: Partial<{
 *     importe: string;
 *     vencimiento: string;
 *     tipo: string;
 *     banco: string;
 *   }>) => void;
 *   escenarioReady: boolean;
 * }} props
 */
export function RevisionRapidaChequeForm({
  values,
  onChange,
  escenarioReady,
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cheque a revisar
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Escenario local · no se persiste · no es una decisión crediticia
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Importe
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={values.importe}
            onChange={(e) => onChange({ importe: e.target.value })}
            className={INPUT}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vencimiento
          </span>
          <input
            type="date"
            value={values.vencimiento}
            onChange={(e) => onChange({ vencimiento: e.target.value })}
            className={INPUT}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Banco / emisor
          </span>
          <input
            type="text"
            placeholder="Opcional"
            value={values.banco}
            onChange={(e) => onChange({ banco: e.target.value })}
            className={INPUT}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo de cheque
          </span>
          <input
            type="text"
            placeholder="Opcional"
            value={values.tipo}
            onChange={(e) => onChange({ tipo: e.target.value })}
            className={INPUT}
          />
        </label>
      </div>

      {!escenarioReady ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Completá importe y vencimiento para ver el escenario informativo.
        </p>
      ) : null}
    </section>
  )
}

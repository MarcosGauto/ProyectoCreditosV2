"use client";

import { useMemo, useState } from "react";

import {
  COMERCIAL_METRIC_TABLES,
  filterComercialCuotasRows,
} from "@/lib/coeficientes/coeficientesComercialDisplay";
import { getTarjetaDisplayLabel } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getCoefFinalHeaderLines } from "@/lib/coeficientes/coeficientesComercialHeaderLabels";
import { CoeficientesComercialLeyenda } from "@/components/coeficientes/CoeficientesComercialLeyenda";

const tableHeadClass =
  "border border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-card sticky top-0 z-20 min-w-[120px]";
/** Encabezados en dos líneas (solo Coeficientes finales). */
const tableHeadCoefFinalClass =
  "border border-border px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-card sticky top-0 z-20 min-w-[120px] max-w-[120px] whitespace-normal leading-tight align-middle";
const tableHeadCuotasClass =
  "border border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted sticky left-0 top-0 z-30 min-w-[88px]";
const tableCellClass =
  "border border-border px-2 py-1.5 text-center text-sm tabular-nums text-foreground/80 min-w-[120px]";
const tableCellCoefFinalClass = `${tableCellClass} whitespace-nowrap`;
const tableCellCuotasClass =
  "border border-border px-2 py-1.5 text-center text-sm font-medium text-muted-foreground bg-card sticky left-0 z-10 min-w-[88px]";
const tableCellEmptyClass =
  "border border-border px-2 py-1.5 text-center text-sm text-muted-foreground min-w-[120px]";
const sectionTitleClass =
  "text-sm font-bold uppercase tracking-wider text-red-400 mb-3";

function formatCoefFinal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCuotasLabel(cuotas) {
  if (cuotas === "Débito") return "Débito";
  return String(cuotas);
}

function cuotasKey(cuotas) {
  return cuotas === "Débito" ? "DEBITO" : String(cuotas);
}

/**
 * @param {Record<string, unknown> | null} cell
 * @param {'coef' | 'pct' | 'money'} format
 */
function formatCellValue(cell, format) {
  if (!cell) return "—";
  const n = Number(cell.value);
  if (!Number.isFinite(n)) return "—";
  if (format === "money") return formatMoney(n);
  return format === "coef" ? formatCoefFinal(n) : formatPct(n);
}

/**
 * @param {{ card: string; tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[] }} props
 */
function CoefFinalColumnHeader({ card, tarjetas }) {
  const lines = getCoefFinalHeaderLines(card, tarjetas);
  if (lines.length === 1) {
    return <span className="block px-0.5">{lines[0]}</span>;
  }
  return (
    <span className="inline-flex min-h-[2.5rem] flex-col items-center justify-center gap-0.5 px-0.5">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}

/**
 * @param {{
 *   title: string;
 *   metricId: string;
 *   format: 'coef' | 'pct' | 'money';
 *   accent?: string;
 *   cards: string[];
 *   tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   cuotasRows: Array<string | number>;
 *   getCell: (cuotas: string | number, tarjeta: string) => Record<string, unknown> | null;
 *   wrapColumnHeaders?: boolean;
 * }} props
 */
function DesktopPivotTable({
  title,
  metricId,
  format,
  accent = "",
  cards,
  tarjetas,
  cuotasRows,
  getCell,
  wrapColumnHeaders = false,
}) {
  return (
    <section>
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className="overflow-x-auto overflow-y-auto rounded-lg border border-border max-h-[70vh] scroll-smooth">
        <table className="w-full border-collapse min-w-max bg-muted">
          <thead>
            <tr>
              <th className={tableHeadCuotasClass}>Cuotas</th>
              {cards.map((card) => (
                <th
                  key={card}
                  className={wrapColumnHeaders ? tableHeadCoefFinalClass : tableHeadClass}
                >
                  {wrapColumnHeaders ? (
                    <CoefFinalColumnHeader card={card} tarjetas={tarjetas} />
                  ) : (
                    getTarjetaDisplayLabel(card, tarjetas)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuotasRows.length === 0 ? (
              <tr>
                <td
                  colSpan={cards.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  Sin datos para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              cuotasRows.map((cuotas) => (
                <tr key={cuotasKey(cuotas)} className="hover:bg-card/50">
                  <td className={tableCellCuotasClass}>
                    {formatCuotasLabel(cuotas)}
                  </td>
                  {cards.map((card) => {
                    const cell = getCell(cuotas, card);
                    const value = cell?.[metricId];
                    const display = formatCellValue(
                      value != null ? { value } : null,
                      format
                    );
                    const isEmpty = display === "—";
                    const cellClass = wrapColumnHeaders
                      ? tableCellCoefFinalClass
                      : tableCellClass;
                    return (
                      <td
                        key={card}
                        className={
                          isEmpty
                            ? tableCellEmptyClass
                            : `${cellClass} ${accent}`
                        }
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * @param {{
 *   title: string;
 *   metricId: string;
 *   format: 'coef' | 'pct' | 'money';
 *   accent?: string;
 *   selectedCard: string;
 *   tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   cuotasRows: Array<string | number>;
 *   getCell: (cuotas: string | number, tarjeta: string) => Record<string, unknown> | null;
 * }} props
 */
function MobileCardTable({
  title,
  metricId,
  format,
  accent = "",
  selectedCard,
  tarjetas,
  cuotasRows,
  getCell,
}) {
  return (
    <section>
      <h2 className={sectionTitleClass}>{title}</h2>
      {!selectedCard ? (
        <p className="text-sm text-muted-foreground">No hay tarjetas activas.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm border-collapse bg-muted">
              <thead>
                <tr className="bg-card">
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">
                    Cuotas
                  </th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuotasRows.map((cuotas) => {
                  const cell = getCell(cuotas, selectedCard);
                  const value = cell?.[metricId];
                  const display = formatCellValue(
                    value != null ? { value } : null,
                    format
                  );
                  return (
                    <tr
                      key={cuotasKey(cuotas)}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatCuotasLabel(cuotas)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          display === "—" ? "text-muted-foreground" : accent || "text-foreground/80"
                        }`}
                      >
                        {display}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      )}
    </section>
  );
}

/**
 * @param {{
 *   display: ReturnType<import("@/lib/coeficientes/coeficientesComercialDisplay").buildComercialDisplay>;
 *   cuotasFilter: import("@/lib/coeficientes/coeficientesComercialDisplay").ComercialCuotasFilter;
 * }} props
 */
export function ComercialConsumoTables({ display, cuotasFilter }) {
  const cuotasRows = useMemo(
    () => filterComercialCuotasRows(display.cuotasRows, cuotasFilter),
    [display.cuotasRows, cuotasFilter]
  );

  const getCell = display.getCell;
  const cards = display.cards;
  const tarjetas = display.tarjetas;

  const [mobileCard, setMobileCard] = useState(cards[0] ?? "");
  const activeMobileCard = cards.includes(mobileCard) ? mobileCard : cards[0] ?? "";

  return (
    <div className="space-y-8">
      {cards.length > 0 && (
        <div className="lg:hidden">
          <label className="text-xs text-muted-foreground block mb-1">Tarjeta</label>
          <select
            className="w-full max-w-sm h-10 rounded-md px-3 bg-card border border-border text-foreground text-sm"
            value={activeMobileCard}
            onChange={(e) => setMobileCard(e.target.value)}
          >
            {cards.map((card) => (
              <option key={card} value={card}>
                {getTarjetaDisplayLabel(card, tarjetas)}
              </option>
            ))}
          </select>
        </div>
      )}

      {COMERCIAL_METRIC_TABLES.map((table) => (
        <div key={table.id}>
          <div className="hidden lg:block">
            <DesktopPivotTable
              title={table.title}
              metricId={table.id}
              format={table.format}
              accent={table.accent}
              cards={cards}
              tarjetas={tarjetas}
              cuotasRows={cuotasRows}
              getCell={getCell}
              wrapColumnHeaders={table.id === "coeficienteFinal"}
            />
            {table.id === "coeficienteFinal" && <CoeficientesComercialLeyenda />}
          </div>
          <div className="lg:hidden">
            <MobileCardTable
              title={table.title}
              metricId={table.id}
              format={table.format}
              accent={table.accent}
              selectedCard={activeMobileCard}
              tarjetas={tarjetas}
              cuotasRows={cuotasRows}
              getCell={getCell}
            />
            {table.id === "coeficienteFinal" && <CoeficientesComercialLeyenda />}
          </div>
        </div>
      ))}
    </div>
  );
}

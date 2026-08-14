"use client";

import { AlertTriangle } from "lucide-react";

import {
  isAmbiguousCell,
  parseCoeficienteValue,
} from "@/lib/coeficientes/parseCoeficientesMatrix";
import { Input } from "@/components/ui/input";

const headClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-card";
const cellClass = "px-2 py-1 border-b border-border/60";
const inputClass =
  "h-8 bg-card border-border text-foreground text-sm tabular-nums text-center";

/**
 * @param {{
 *   matrix: import("@/lib/coeficientes/parseCoeficientesMatrix").ImportMatrix;
 *   onChange: (matrix: import("@/lib/coeficientes/parseCoeficientesMatrix").ImportMatrix) => void;
 *   readOnly?: boolean;
 *   coefColumnLabel?: string;
 *   highlightInvalidRows?: boolean;
 * }} props
 */
export function CoeficientesImportMatrixEditor({
  matrix,
  onChange,
  readOnly = false,
  coefColumnLabel,
  highlightInvalidRows = false,
}) {
  const updateCell = (rowIdx, card, raw) => {
    const next = structuredClone(matrix);
    const parsed = parseCoeficienteValue(raw);
    const ambiguous = isAmbiguousCell(raw, parsed);
    next.rows[rowIdx].cells[card] = {
      raw: String(raw),
      coeficienteBase: Number.isFinite(parsed) ? parsed : 0,
      ambiguous,
    };
    if (highlightInvalidRows) {
      next.rows[rowIdx].invalid = ambiguous;
    }
    onChange(next);
  };

  const updateCuotas = (rowIdx, raw) => {
    const next = structuredClone(matrix);
    const trimmed = String(raw).trim();
    if (/^d[eé]bito$/i.test(trimmed)) {
      next.rows[rowIdx].cuotas = "Débito";
    } else {
      const n = Number(trimmed);
      next.rows[rowIdx].cuotas = Number.isFinite(n) ? n : trimmed;
    }
    onChange(next);
  };

  const isRowHighlighted = (row) => {
    if (!highlightInvalidRows) return false;
    if (row.invalid) return true;
    return matrix.cards.some((card) => row.cells[card]?.ambiguous);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr>
            <th className={headClass}>Cuota</th>
            {matrix.cards.map((card) => (
              <th key={card} className={headClass}>
                {coefColumnLabel ?? card}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, rowIdx) => {
            const highlighted = isRowHighlighted(row);
            return (
              <tr
                key={rowIdx}
                className={
                  highlighted
                    ? "bg-amber-500/15 hover:bg-amber-500/20"
                    : "hover:bg-muted/30"
                }
              >
              <td className={`${cellClass} w-24`}>
                {readOnly ? (
                  <span className="text-muted-foreground px-2">{String(row.cuotas)}</span>
                ) : (
                  <Input
                    className={`${inputClass} ${
                      highlighted ? "border-amber-500/50 bg-amber-500/10" : ""
                    }`}
                    value={String(row.cuotas)}
                    onChange={(e) => updateCuotas(rowIdx, e.target.value)}
                  />
                )}
              </td>
              {matrix.cards.map((card) => {
                const cell = row.cells[card];
                const ambiguous = cell?.ambiguous;
                return (
                  <td key={card} className={cellClass}>
                    <div className="relative">
                      {readOnly ? (
                        <span
                          className={`block text-center tabular-nums px-2 ${
                            ambiguous ? "text-amber-300" : "text-foreground"
                          }`}
                        >
                          {cell?.raw || "—"}
                        </span>
                      ) : (
                        <Input
                          className={`${inputClass} ${
                            ambiguous || highlighted
                              ? "border-amber-500/60 bg-amber-500/10 text-amber-100"
                              : ""
                          }`}
                          value={cell?.raw ?? ""}
                          onChange={(e) => updateCell(rowIdx, card, e.target.value)}
                        />
                      )}
                      {ambiguous && (
                        <AlertTriangle
                          className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-400"
                          aria-label="Valor ambiguo — revisar"
                        />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

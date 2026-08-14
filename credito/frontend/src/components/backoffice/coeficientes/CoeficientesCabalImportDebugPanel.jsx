"use client";

import { Bug } from "lucide-react";

import { CoeficientesImportMatrixEditor } from "@/components/backoffice/coeficientes/CoeficientesImportMatrixEditor";
import { countAmbiguousCells } from "@/lib/coeficientes/parseCoeficientesImport";
import { formatFileKindLabel, describeImportMethodPreview } from "@/lib/coeficientes/parsers/parserUtils";
import { getTarjetaDisplayLabel } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";

const tableHeadClass =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass =
  "px-3 py-2 border-b border-border/60 text-xs text-muted-foreground";

/**
 * @param {{
 *   acquirerId?: string;
 *   file: File | null;
 *   fileKind: string | null;
 *   preview: import("@/lib/coeficientes/parsers/parserTypes").AcquirerParseResult;
 *   matrix: import("@/lib/coeficientes/parseCoeficientesMatrix").ImportMatrix;
 *   onChange: (matrix: import("@/lib/coeficientes/parseCoeficientesMatrix").ImportMatrix) => void;
 *   readOnly?: boolean;
 * }} props
 */
export function CoeficientesCabalImportDebugPanel({
  acquirerId = "",
  file,
  fileKind,
  preview,
  matrix,
  onChange,
  readOnly = false,
}) {
  const debug = preview.debug;
  const errors = preview.errors ?? [];
  const warnings = preview.warnings ?? [];
  const ambiguousCount = countAmbiguousCells(matrix);
  const invalidRows =
    debug?.invalidRows ??
    matrix.rows.filter(
      (row) =>
        row.invalid || Object.values(row.cells).some((cell) => cell.ambiguous)
    ).length;

  const importMethod = debug?.importMethod ?? "—";
  const recordsFound = debug?.recordsFound ?? preview.records.length;
  const recordsDiscarded = debug?.recordsDiscarded ?? debug?.ocrDiscardedRows?.length ?? 0;
  const recordsPendingReview = ambiguousCount;

  const ocrDetectedRows = debug?.ocrDetectedRows ?? [];
  const ocrDiscardedRows = debug?.ocrDiscardedRows ?? [];
  const ocrRawText = debug?.ocrRawText ?? "";

  const geminiRawText =
    debug?.geminiRawResponse ?? debug?.geminiRawText ?? preview.rawText ?? "";
  const geminiDetectedJson = debug?.geminiDetectedJson ?? "";
  const geminiParseError = debug?.geminiParseError ?? "";
  const geminiApiKeyConfigured = debug?.geminiApiKeyConfigured;
  const geminiStatus = debug?.geminiStatus ?? "";
  const geminiError = debug?.geminiError ?? "";

  const showGeminiSection =
    importMethod === "Gemini" ||
    importMethod === "Manual" ||
    Boolean(geminiRawText || geminiStatus || geminiError);

  const isRegexOcrMethod = String(importMethod).startsWith("Regex");
  const regexOcrLabel = isRegexOcrMethod
    ? String(importMethod).toLowerCase()
    : "ocr";

  const showOcrSection =
    isRegexOcrMethod || Boolean(ocrRawText || ocrDetectedRows.length);

  const metaItems = [
    { label: "Archivo", value: file?.name ?? "—" },
    {
      label: "Método utilizado",
      value: importMethod,
    },
    {
      label: "Tipo detectado",
      value: formatFileKindLabel(debug?.fileKind ?? fileKind ?? "unknown"),
    },
    {
      label: "Registros detectados",
      value: String(recordsFound),
    },
    {
      label: "Registros descartados",
      value: String(recordsDiscarded),
    },
    {
      label: "Pendientes revisión manual",
      value: String(recordsPendingReview),
    },
    {
      label: "Filas en vista previa",
      value: String(debug?.totalRows ?? matrix.rows.length),
    },
  ];

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden space-y-0">
      <div className="px-5 py-4 border-b border-amber-500/20 flex items-center gap-2">
        <Bug className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-200">
          Depuración — importación {getTarjetaDisplayLabel(acquirerId, getTarjetasCache())}
        </h2>
      </div>

      <div className="p-5 space-y-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {metaItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-background/20 px-3 py-2"
            >
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 text-foreground/80 font-medium break-all">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-300 mb-2">
              Errores
            </h3>
            {errors.length > 0 ? (
              <ul className="text-xs text-red-100/90 space-y-1 list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Ninguno</p>
            )}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-2">
              Advertencias
            </h3>
            {warnings.length > 0 ? (
              <ul className="text-xs text-amber-100/90 space-y-1 list-disc list-inside">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Ninguna</p>
            )}
          </div>
        </div>

        {(showOcrSection || showGeminiSection) && (
          <div className="space-y-4 rounded-lg border border-border bg-background/20 p-4">
            <h3 className="text-sm font-semibold text-foreground/80">
              Texto extraído (OCR / PDF)
            </h3>

            {showOcrSection && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">
                    OCR local ({regexOcrLabel}):
                  </p>
                  <pre className="p-3 rounded-lg bg-background/40 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground max-h-48 overflow-y-auto">
                    {ocrRawText || "—"}
                  </pre>
                </div>

                <p className="text-muted-foreground">
                  Registros encontrados (regex):{" "}
                  <span className="font-semibold text-foreground">
                    {isRegexOcrMethod ? recordsFound : ocrDetectedRows.length}
                  </span>
                </p>
              </div>
            )}

            {showGeminiSection && (
              <div className="space-y-3 text-xs border-t border-border pt-4">
                <div className="rounded-lg border border-border bg-background/30 px-3 py-2">
                  <p className="font-medium text-muted-foreground mb-1">Estado Gemini:</p>
                  <p className="text-muted-foreground">
                    API Key configurada:{" "}
                    <span
                      className={
                        geminiApiKeyConfigured
                          ? "text-green-400 font-medium"
                          : geminiApiKeyConfigured === false
                            ? "text-red-400 font-medium"
                            : "text-muted-foreground"
                      }
                    >
                      {geminiApiKeyConfigured === true
                        ? "Sí"
                        : geminiApiKeyConfigured === false
                          ? "No"
                          : "—"}
                    </span>
                  </p>
                  {geminiStatus && (
                    <p className="text-muted-foreground mt-1">
                      Status: <span className="text-amber-300">{geminiStatus}</span>
                    </p>
                  )}
                  {geminiError && (
                    <p className="text-muted-foreground mt-1">
                      Error: <span className="text-red-300">{geminiError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-medium text-muted-foreground mb-1">Gemini raw:</p>
                  <pre className="p-3 rounded-lg bg-background/40 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground max-h-48 overflow-y-auto">
                    {geminiRawText || "—"}
                  </pre>
                </div>

                <div>
                  <p className="font-medium text-muted-foreground mb-1">JSON detectado:</p>
                  <pre className="p-3 rounded-lg bg-background/40 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-green-300/90 max-h-48 overflow-y-auto">
                    {geminiDetectedJson || "—"}
                  </pre>
                </div>

                {geminiParseError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                    <p className="font-medium text-red-300 mb-1">Error de parseo:</p>
                    <p className="text-red-100/90 font-mono text-[11px]">
                      {geminiParseError}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-green-400/90 mb-2">
                Filas detectadas ({ocrDetectedRows.length})
              </h4>
              {ocrDetectedRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className={tableHeadClass}>Línea</th>
                        <th className={tableHeadClass}>Cuotas</th>
                        <th className={tableHeadClass}>Coeficiente encontrado</th>
                        <th className={tableHeadClass}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrDetectedRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/40">
                          <td className={tableCellClass}>{row.lineNumber || "—"}</td>
                          <td className={tableCellClass}>{row.cuotas}</td>
                          <td className={`${tableCellClass} tabular-nums text-green-300`}>
                            {row.coeficiente.toLocaleString("es-AR", {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className={`${tableCellClass} font-mono text-[10px] text-muted-foreground`}>
                            {row.line}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ninguna fila detectada.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-red-400/90 mb-2">
                Filas descartadas ({ocrDiscardedRows.length})
              </h4>
              {ocrDiscardedRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className={tableHeadClass}>Línea</th>
                        <th className={tableHeadClass}>Motivo</th>
                        <th className={tableHeadClass}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrDiscardedRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/40">
                          <td className={tableCellClass}>{row.lineNumber || "—"}</td>
                          <td className={`${tableCellClass} text-amber-200/90`}>
                            {row.reason}
                          </td>
                          <td className={`${tableCellClass} font-mono text-[10px] text-muted-foreground`}>
                            {row.line}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ninguna fila descartada.</p>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-1">
            Vista previa
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {describeImportMethodPreview(importMethod)}
            {recordsPendingReview > 0 && (
              <span className="text-amber-300">
                {" "}
                · {recordsPendingReview} celda(s) requieren revisión manual
              </span>
            )}
          </p>

          <CoeficientesImportMatrixEditor
            matrix={matrix}
            onChange={onChange}
            readOnly={readOnly}
            coefColumnLabel="Coeficiente detectado"
            highlightInvalidRows
          />
        </div>
      </div>
    </section>
  );
}

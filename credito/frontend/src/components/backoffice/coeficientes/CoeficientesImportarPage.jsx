"use client";

import { useEffect, useMemo, useState } from "react";
import { FileImage, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesImportaciones } from "@/hooks/useCoeficientesImportaciones";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import { CoeficientesCabalImportDebugPanel } from "@/components/backoffice/coeficientes/CoeficientesCabalImportDebugPanel";
import { CoeficientesImportMatrixEditor } from "@/components/backoffice/coeficientes/CoeficientesImportMatrixEditor";
import { buildStoredRecords, formatInteresFactor } from "@/lib/coeficientes/coeficientesCalculo";
import {
  countAmbiguousCells,
  getAcquirerOption,
  isAcquirerImplemented,
  matrixColumnToRecords,
  parseCoeficientesImportFile,
} from "@/lib/coeficientes/parseCoeficientesImport";
import { detectImportFileKind } from "@/lib/coeficientes/parsers/parserUtils";
import { mapImportMethodToOrigen } from "@/lib/coeficientes/coeficientesHistorialModel";
import {
  isFullImportParser,
  isRawBaseParser,
} from "@/lib/coeficientes/parsers/parserDefinitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

export function CoeficientesImportarPage() {
  const { user, isAdmin } = useAuth();
  const { globales } = useCoeficientesGlobales();
  const { tarjetas, importTarjetas, loading: loadingTarjetas } =
    useCoeficientesTarjetas();
  const { importar, saving, error } = useCoeficientesImportaciones({
    userEmail: user?.email ?? null,
  });

  const [acquirerId, setAcquirerId] = useState("");
  const [vigenciaDesde, setVigenciaDesde] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState("");
  const [parseProgress, setParseProgress] = useState(0);
  const [preview, setPreview] = useState(
    /** @type {import("@/lib/coeficientes/parsers/parserTypes").AcquirerParseResult | null} */ (
      null
    )
  );
  const [editableMatrix, setEditableMatrix] = useState(
    /** @type {import("@/lib/coeficientes/parseCoeficientesMatrix").ImportMatrix | null} */ (
      null
    )
  );
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!acquirerId && importTarjetas.length > 0) {
      setAcquirerId(importTarjetas[0].codigo);
    }
  }, [importTarjetas, acquirerId]);

  const selectedTarjeta = importTarjetas.find((t) => t.codigo === acquirerId) ?? null;
  const acquirerOption = getAcquirerOption(acquirerId, tarjetas);
  const acquirerImplemented = isAcquirerImplemented(acquirerId, tarjetas);
  const ambiguousCount = editableMatrix ? countAmbiguousCells(editableMatrix) : 0;

  const validImportCount = useMemo(() => {
    if (!editableMatrix?.cards?.length) return 0;
    return matrixColumnToRecords(editableMatrix, editableMatrix.cards[0]).length;
  }, [editableMatrix]);

  const fileInputDisabled = !isAdmin || !acquirerImplemented;

  const importButtonVisible =
    isAdmin && Boolean(editableMatrix) && acquirerImplemented;
  const importButtonDisabled = saving || validImportCount === 0;

  const previewCalculada = useMemo(() => {
    if (!editableMatrix?.cards?.length) return [];
    const card = editableMatrix.cards[0];
    const records = matrixColumnToRecords(editableMatrix, card);
    return buildStoredRecords(records, globales);
  }, [editableMatrix, globales]);

  const handleAcquirerChange = (value) => {
    setAcquirerId(value);
    setFile(null);
    setPreview(null);
    setEditableMatrix(null);
    setMessage(null);
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setEditableMatrix(null);
    setMessage(null);
    setParseProgress(0);
    setParseStatus("");

    if (!selected) return;

    if (!acquirerImplemented) {
      setMessage(
        `El lector de ${acquirerOption?.label ?? acquirerId} aún no está disponible.`
      );
      return;
    }

    setParsing(true);
    try {
      const result = await parseCoeficientesImportFile(
        acquirerId,
        selected,
        (pct, status) => {
          setParseProgress(pct);
          setParseStatus(status);
        }
      );

      setPreview(result);

      if (result.implemented === false) {
        setMessage(result.warnings[0] ?? "Parser no disponible.");
        return;
      }

      if (result.matrix?.cards?.length) {
        setEditableMatrix(structuredClone(result.matrix));
      }
    } catch (err) {
      console.error(err);
      setMessage(
        `No se pudo procesar el archivo con el lector ${acquirerOption?.label ?? acquirerId}.`
      );
    } finally {
      setParsing(false);
      setParseStatus("");
    }
  };

  const handleConfirmImport = async () => {
    if (!isAdmin || !editableMatrix || !acquirerImplemented) return;
    setMessage(null);

    const card = editableMatrix.cards[0];
    const records = matrixColumnToRecords(editableMatrix, card);
    if (!records.length) {
      setMessage("No hay registros válidos para importar.");
      return;
    }

    const skipped = editableMatrix.rows.length - records.length;

    try {
      await importar({
        tarjeta: card,
        records,
        vigenciaDesde,
        globales,
        origen: mapImportMethodToOrigen(preview?.importMethod),
        observaciones: `Importación ${card} desde ${vigenciaDesde}`,
      });
      setMessage(
        skipped > 0
          ? `Importación exitosa: ${records.length} registros para ${card} (${skipped} fila(s) omitida(s)).`
          : `Importación exitosa: ${records.length} registros para ${card}.`
      );
      setFile(null);
      setPreview(null);
      setEditableMatrix(null);
    } catch {
      setMessage("Error al guardar la importación.");
    }
  };

  const isFullImportAtSave = isFullImportParser(selectedTarjeta?.parser);
  const isRawBaseImport = isRawBaseParser(selectedTarjeta?.parser);
  const hasMediaParser = isFullImportAtSave || isRawBaseImport;
  const fileAccept = hasMediaParser
    ? ".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf,image/png,image/jpeg"
    : ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf";
  const fileLabel = hasMediaParser
    ? "Archivo (Excel / CSV · imagen/PDF con OCR+regex o IA)"
    : "Archivo (PDF, Excel, CSV, PNG, JPG)";

  const fileKind = file ? detectImportFileKind(file) : null;

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-5 h-5 text-red-400" />
          <h1 className="text-2xl font-bold">Importar Coeficientes</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Seleccione la tarjeta configurada y suba su archivo. Las tarjetas con carga
          automática aparecen según la configuración en{" "}
          <strong className="text-foreground">Tarjetas</strong>. Las de carga manual se
          gestionan en Tablas Vigentes.
        </p>
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : message?.includes("Error") || message?.includes("ambiguo")
                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Solo administradores pueden importar coeficientes.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
        {loadingTarjetas ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tarjetas…
          </p>
        ) : importTarjetas.length === 0 ? (
          <p className="text-sm text-amber-200/90">
            No hay tarjetas con importación automática. Cree una en Ajustes →
            Coeficientes → Tarjetas.
          </p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-muted-foreground">Tarjeta</Label>
            <select
              className={`w-full h-10 rounded-md px-3 ${inputClass}`}
              value={acquirerId}
              disabled={!isAdmin || importTarjetas.length === 0}
              onChange={(e) => handleAcquirerChange(e.target.value)}
            >
              {importTarjetas.map((opt) => (
                <option key={opt.codigo} value={opt.codigo}>
                  {opt.nombre}
                </option>
              ))}
            </select>
            {acquirerOption?.description && acquirerImplemented && (
              <p className="text-xs text-muted-foreground">{acquirerOption.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Fecha de vigencia</Label>
            <Input
              type="date"
              className={inputClass}
              value={vigenciaDesde}
              readOnly={!isAdmin}
              onChange={(e) => setVigenciaDesde(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-muted-foreground">{fileLabel}</Label>
            <Input
              type="file"
              accept={fileAccept}
              className={inputClass}
              disabled={fileInputDisabled}
              onChange={(e) => void handleFileChange(e)}
            />
            {parsing && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {parseStatus || `Lector ${acquirerOption?.label}…`}
                  {parseProgress > 0 && ` (${parseProgress}%)`}
                </p>
                {parseProgress > 0 && (
                  <div className="h-1 w-full max-w-xs bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {file && !parsing && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {fileKind === "image" ? (
                  <FileImage className="h-3 w-3" />
                ) : (
                  <FileSpreadsheet className="h-3 w-3" />
                )}
                {file.name}
                {preview?.source && ` · ${preview.source}`}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Interés adicional vigente: {formatInteresFactor(globales.interes)} — (base +
          arancel crédito) × factor en 2+ cuotas.
        </p>

        {preview?.warnings?.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 space-y-1">
            {preview.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {importButtonVisible && (
          <Button
            type="button"
            variant="primary"
            disabled={importButtonDisabled}
            onClick={() => void handleConfirmImport()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Confirmar importación — {acquirerOption?.label}
            {validImportCount > 0 && ` (${validImportCount} válidos)`}
            {ambiguousCount > 0 && (
              <span className="ml-1 text-amber-200/80 text-xs">
                · {ambiguousCount} a revisar
              </span>
            )}
          </Button>
        )}
      </section>

      {editableMatrix && hasMediaParser && preview && (
        <CoeficientesCabalImportDebugPanel
          acquirerId={acquirerId}
          file={file}
          fileKind={fileKind}
          preview={preview}
          matrix={editableMatrix}
          onChange={setEditableMatrix}
          readOnly={!isAdmin}
        />
      )}

      {editableMatrix && !hasMediaParser && (
        <section className="rounded-2xl border border-border overflow-hidden space-y-4 p-5 bg-card">
          <div>
            <h2 className="text-sm font-semibold text-foreground/80">
              Vista previa editable — {acquirerOption?.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Revise y corrija antes de confirmar. No se guarda automáticamente.
              {ambiguousCount > 0 && (
                <span className="text-amber-300">
                  {" "}
                  · {ambiguousCount} celda(s) ambigua(s)
                </span>
              )}
            </p>
          </div>

          <CoeficientesImportMatrixEditor
            matrix={editableMatrix}
            onChange={setEditableMatrix}
            readOnly={!isAdmin}
          />

          {preview?.rawText && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-muted-foreground">
                Texto extraído (OCR / PDF)
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-background/40 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                {preview.rawText}
              </pre>
            </details>
          )}
        </section>
      )}

      {previewCalculada.length > 0 && isFullImportAtSave && (
        <section className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground/80">
              Cálculo previo al guardado
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={tableHeadClass}>Cuotas</th>
                  <th className={tableHeadClass}>Coef. Base</th>
                  <th className={tableHeadClass}>Int. Adic.</th>
                  <th className={tableHeadClass}>Coef. Final</th>
                </tr>
              </thead>
              <tbody>
                {previewCalculada.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/40">
                    <td className={tableCellClass}>{row.cuotas}</td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {row.coeficienteBase.toLocaleString("es-AR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {row.interesAdicional > 1
                        ? formatInteresFactor(row.interesAdicional)
                        : "—"}
                    </td>
                    <td className={`${tableCellClass} tabular-nums text-red-300`}>
                      {row.coeficienteFinal.toLocaleString("es-AR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {validImportCount > 0 && isRawBaseImport && editableMatrix && (
        <section className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground/80">
              Vista previa {acquirerOption?.label} (solo coeficiente base)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Se guardará el valor tal cual aparece en la tabla. Sin arancel, interés
              ni conversión a porcentaje.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={tableHeadClass}>Cuotas</th>
                  <th className={tableHeadClass}>Coeficiente</th>
                </tr>
              </thead>
              <tbody>
                {matrixColumnToRecords(editableMatrix, editableMatrix.cards[0]).map(
                  (row, idx) => (
                    <tr key={idx} className="hover:bg-muted/40">
                      <td className={tableCellClass}>{row.cuotas}</td>
                      <td className={`${tableCellClass} tabular-nums`}>
                        {row.coeficienteBase.toLocaleString("es-AR", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

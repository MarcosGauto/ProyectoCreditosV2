"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  EMPTY_NOSIS_INDICATORS,
  nosisDocToIndicators,
} from "@/lib/nosisModel"
import { saveNosisIndicators } from "@/lib/saveNosisIndicators"
import { calculateNosisScore, getNosisRatingLabel } from "@/lib/nosisScore"

/**
 * @param {{
 *   cuit: string;
 *   doc: Record<string, unknown> & { id: string };
 *   usuario?: string | null;
 *   onSaved?: () => void | Promise<void>;
 * }} props
 */
export function NosisIndicatorsForm({ cuit, doc, usuario = null, onSaved }) {
  const [values, setValues] = useState(() => nosisDocToIndicators(doc))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setValues(nosisDocToIndicators(doc))
  }, [doc])

  const previewScore = calculateNosisScore(values)

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = useCallback(
    async (validationStatus) => {
      setSaving(true)
      setError("")
      try {
        const consultasFromDoc =
          doc.parsedData?.consultas?.ultimos4Meses ??
          doc.consultasUltimos4Meses ??
          (doc.indicadores &&
          typeof doc.indicadores === "object" &&
          /** @type {Record<string, unknown>} */ (doc.indicadores).consultasUltimos4Meses)

        await saveNosisIndicators({
          cuit,
          docId: doc.id,
          indicadores: {
            ...values,
            ...(consultasFromDoc ? { consultasUltimos4Meses: consultasFromDoc } : {}),
          },
          validationStatus,
          usuario,
        })
        await onSaved?.()
      } catch (err) {
        console.error("[NosisIndicatorsForm]", err)
        setError("No se pudieron guardar los indicadores NOSIS.")
      } finally {
        setSaving(false)
      }
    },
    [cuit, doc.id, values, usuario, onSaved]
  )

  const fields = [
    { key: "situacionBcra", label: "Situación BCRA (1-5)" },
    { key: "cantidadCheques", label: "Cantidad cheques rechazados" },
    { key: "montoCheques", label: "Monto total cheques ($)" },
    { key: "chequesImpagos", label: "Cheques impagos / multas" },
  ]

  return (
    <div className="space-y-3 p-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(({ key, label }) => (
          <label key={key} className="block space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            <Input
              value={values[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-8 text-xs bg-muted border-border"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2 text-foreground/80">
          <input
            type="checkbox"
            checked={values.moraVigente}
            onChange={(e) => handleChange("moraVigente", e.target.checked)}
          />
          Mora vigente
        </label>
        <label className="flex items-center gap-2 text-foreground/80">
          <input
            type="checkbox"
            checked={values.juiciosConcursos}
            onChange={(e) => handleChange("juiciosConcursos", e.target.checked)}
          />
          Juicios / concursos
        </label>
      </div>

      <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs">
        <span className="text-muted-foreground">Score NOSIS estimado: </span>
        <span className="font-bold text-foreground tabular-nums">
          {previewScore}/100
        </span>
        <span className="text-muted-foreground ml-2">
          ({getNosisRatingLabel(previewScore)})
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={() => void handleSave("draft")}
          className="h-8 text-xs"
        >
          Guardar borrador
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          disabled={saving}
          onClick={() => void handleSave("confirmed")}
          className="h-8 text-xs"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Confirmar indicadores
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

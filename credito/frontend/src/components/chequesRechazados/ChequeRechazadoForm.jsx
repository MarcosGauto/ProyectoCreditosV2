"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CHEQUE_ESTADO,
  CHEQUE_ESTADO_LABEL,
  MOTIVOS_RECHAZO_OPTIONS,
} from "@/lib/chequesRechazadosModel"
import { resolveRazonSocialByCuit } from "@/lib/chequesRechazadosService"

const EMPTY_FORM = {
  cuit: "",
  razonSocial: "",
  numeroCheque: "",
  banco: "",
  fechaEmision: "",
  fechaVencimiento: "",
  fechaRechazo: "",
  motivoRechazo: MOTIVOS_RECHAZO_OPTIONS[0],
  importe: "",
  observaciones: "",
  estado: CHEQUE_ESTADO.PENDIENTE,
  fechaAbono: "",
  observacionesPago: "",
}

/**
 * @param {{
 *   initialData?: import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc | null;
 *   mode?: "create" | "edit";
 *   saving?: boolean;
 *   onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
 *   onCancel?: () => void;
 * }} props
 */
export function ChequeRechazadoForm({
  initialData = null,
  mode = "create",
  saving = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [imagenCheque, setImagenCheque] = useState(/** @type {File | null} */ (null))
  const [notaDebito, setNotaDebito] = useState(/** @type {File | null} */ (null))
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!initialData) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      cuit: String(initialData.cuit ?? ""),
      razonSocial: String(initialData.razonSocial ?? ""),
      numeroCheque: String(initialData.numeroCheque ?? ""),
      banco: String(initialData.banco ?? ""),
      fechaEmision: initialData.fechaEmision
        ? String(initialData.fechaEmision).slice(0, 10)
        : "",
      fechaVencimiento: initialData.fechaVencimiento
        ? String(initialData.fechaVencimiento).slice(0, 10)
        : "",
      fechaRechazo: initialData.fechaRechazo
        ? String(initialData.fechaRechazo).slice(0, 10)
        : "",
      motivoRechazo: String(initialData.motivoRechazo ?? MOTIVOS_RECHAZO_OPTIONS[0]),
      importe: String(initialData.importe ?? ""),
      observaciones: String(initialData.observaciones ?? ""),
      estado: initialData.estado ?? CHEQUE_ESTADO.PENDIENTE,
      fechaAbono: initialData.fechaAbono
        ? String(initialData.fechaAbono).slice(0, 10)
        : "",
      observacionesPago: String(initialData.observacionesPago ?? ""),
    })
  }, [initialData])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLookupCuit = async () => {
    const cuit = form.cuit.replace(/\D/g, "")
    if (cuit.length !== 11) {
      setError("El CUIT debe tener 11 dígitos.")
      return
    }

    setLookupLoading(true)
    setError("")
    try {
      const razonSocial = await resolveRazonSocialByCuit(cuit)
      setForm((prev) => ({
        ...prev,
        cuit,
        razonSocial: razonSocial || prev.razonSocial,
      }))
      if (!razonSocial) {
        setError("No se encontró razón social. Podés cargarla manualmente.")
      }
    } catch (lookupError) {
      console.error(lookupError)
      setError("No se pudo consultar la razón social.")
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    const cuit = form.cuit.replace(/\D/g, "")
    if (cuit.length !== 11) {
      setError("El CUIT debe tener 11 dígitos.")
      return
    }
    if (!form.numeroCheque.trim()) {
      setError("Indicá el número de cheque.")
      return
    }
    if (!form.banco.trim()) {
      setError("Indicá el banco.")
      return
    }
    if (!form.fechaRechazo) {
      setError("Indicá la fecha de rechazo.")
      return
    }
    if (form.estado === CHEQUE_ESTADO.ABONADO && !form.fechaAbono) {
      setError("Indicá la fecha de cancelación para marcar como Abonado.")
      return
    }

    await onSubmit({
      ...form,
      cuit,
      imagenCheque,
      notaDebito,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cuit">CUIT</Label>
          <div className="flex gap-2">
            <Input
              id="cuit"
              value={form.cuit}
              onChange={(e) => handleChange("cuit", e.target.value)}
              placeholder="20123456789"
              className="bg-background border-border text-foreground"
              disabled={mode === "edit"}
            />
            {mode === "create" && (
              <DashboardButton
                type="button"
                variant="secondary"
                size="md"
                onClick={handleLookupCuit}
                disabled={lookupLoading}
                className="shrink-0"
              >
                {lookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </DashboardButton>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="razonSocial">Razón social</Label>
          <Input
            id="razonSocial"
            value={form.razonSocial}
            onChange={(e) => handleChange("razonSocial", e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numeroCheque">Número de cheque</Label>
          <Input
            id="numeroCheque"
            value={form.numeroCheque}
            onChange={(e) => handleChange("numeroCheque", e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="banco">Banco</Label>
          <Input
            id="banco"
            value={form.banco}
            onChange={(e) => handleChange("banco", e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fechaEmision">Fecha de emisión</Label>
          <Input
            id="fechaEmision"
            type="date"
            value={form.fechaEmision}
            onChange={(e) => handleChange("fechaEmision", e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
          <Input
            id="fechaVencimiento"
            type="date"
            value={form.fechaVencimiento}
            onChange={(e) => handleChange("fechaVencimiento", e.target.value)}
            className="bg-background border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fechaRechazo">Fecha de rechazo</Label>
          <Input
            id="fechaRechazo"
            type="date"
            value={form.fechaRechazo}
            onChange={(e) => handleChange("fechaRechazo", e.target.value)}
            className="bg-background border-border text-foreground"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="importe">Importe</Label>
          <Input
            id="importe"
            value={form.importe}
            onChange={(e) => handleChange("importe", e.target.value)}
            placeholder="1500000"
            className="bg-background border-border text-foreground"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="motivoRechazo">Motivo del rechazo</Label>
          <select
            id="motivoRechazo"
            value={form.motivoRechazo}
            onChange={(e) => handleChange("motivoRechazo", e.target.value)}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-foreground text-sm"
          >
            {MOTIVOS_RECHAZO_OPTIONS.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </select>
        </div>

        {mode === "edit" && (
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              value={form.estado}
              onChange={(e) => handleChange("estado", e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-foreground text-sm"
            >
              {Object.entries(CHEQUE_ESTADO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "edit" && form.estado === CHEQUE_ESTADO.ABONADO && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fechaAbono">Fecha de cancelación</Label>
              <Input
                id="fechaAbono"
                type="date"
                value={form.fechaAbono}
                onChange={(e) => handleChange("fechaAbono", e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacionesPago">Observaciones de pago</Label>
              <textarea
                id="observacionesPago"
                value={form.observacionesPago}
                onChange={(e) => handleChange("observacionesPago", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm"
              />
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <textarea
            id="observaciones"
            value={form.observaciones}
            onChange={(e) => handleChange("observaciones", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imagenCheque">Imagen del cheque (jpg, png, pdf)</Label>
          <Input
            id="imagenCheque"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setImagenCheque(e.target.files?.[0] ?? null)}
            className="bg-background border-border text-foreground"
          />
          {initialData?.imagenChequeUrl && (
            <p className="text-xs text-muted-foreground">Hay un archivo cargado. Subí uno nuevo para reemplazarlo.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notaDebito">Nota de débito (pdf)</Label>
          <Input
            id="notaDebito"
            type="file"
            accept=".pdf"
            onChange={(e) => setNotaDebito(e.target.files?.[0] ?? null)}
            className="bg-background border-border text-foreground"
          />
          {initialData?.notaDebitoUrl && (
            <p className="text-xs text-muted-foreground">Hay una nota cargada. Subí un PDF nuevo para reemplazarla.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        {onCancel && (
          <DashboardButton
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </DashboardButton>
        )}
        <DashboardButton type="submit" variant="primary" size="md" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : mode === "create" ? (
            "Registrar cheque"
          ) : (
            "Guardar cambios"
          )}
        </DashboardButton>
      </div>
    </form>
  )
}

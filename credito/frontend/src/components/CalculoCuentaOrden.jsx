"use client"

import { useEffect, useMemo, useState } from "react"
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore"
import {
  ArrowRightLeft,
  BadgeDollarSign,
  FileDown,
  FileText,
  Landmark,
  RotateCcw,
  Save,
  Settings2,
  User,
} from "lucide-react"

import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateCuentaOrdenResumenPdf } from "@/lib/generateCuentaOrdenResumenPdf"
import { db } from "@/service/firebase"

const comisiones = {
  general: {
    sinFactura: [
      { min: 11, max: 15, valor: 0.06 },
      { min: 16, max: 20, valor: 0.07 },
      { min: 21, max: 30, valor: 0.1 },
      { min: 31, max: 40, valor: 0.12 },
      { min: 41, max: 50, valor: 0.13 },
    ],
    inscripto: [
      { min: 11, max: 15, valor: 0.02 },
      { min: 16, max: 20, valor: 0.02 },
      { min: 21, max: 30, valor: 0.03 },
      { min: 31, max: 40, valor: 0.03 },
      { min: 41, max: 50, valor: 0.04 },
    ],
    monotributo: [
      { min: 11, max: 15, valor: 0.04 },
      { min: 16, max: 20, valor: 0.05 },
      { min: 21, max: 30, valor: 0.06 },
      { min: 31, max: 40, valor: 0.08 },
      { min: 41, max: 50, valor: 0.09 },
    ],
  },
  tarjeta: {
    sinFactura: [
      { min: 11, max: 15, valor: 0.09 },
      { min: 16, max: 20, valor: 0.11 },
      { min: 21, max: 30, valor: 0.15 },
      { min: 31, max: 40, valor: 0.18 },
      { min: 41, max: 50, valor: 0.21 },
    ],
    inscripto: [
      { min: 11, max: 15, valor: 0.04 },
      { min: 16, max: 20, valor: 0.04 },
      { min: 21, max: 30, valor: 0.04 },
      { min: 31, max: 40, valor: 0.04 },
      { min: 41, max: 50, valor: 0.05 },
    ],
    monotributo: [
      { min: 11, max: 15, valor: 0.06 },
      { min: 16, max: 20, valor: 0.07 },
      { min: 21, max: 30, valor: 0.08 },
      { min: 31, max: 40, valor: 0.1 },
      { min: 41, max: 50, valor: 0.12 },
    ],
  },
}

const TIPO_ACREDITACION = {
  CUENTA_GN: "cuenta_gn",
  TRANSFERENCIA: "transferencia",
}

const EMPTY_FORM = {
  cuit: "",
  cliente: "",
  clienteGN: "",
  idGbp: "",
  tipoAcreditacion: TIPO_ACREDITACION.CUENTA_GN,
  proforma: "",
  percepciones: "",
  ganancia: "",
  tipoCliente: "",
  tipoOperacion: "",
  accion: "",
  banco: "",
  cbu: "",
}

const inputClass =
  "bg-background border-border text-foreground h-11 rounded-xl placeholder:text-muted-foreground focus-visible:ring-red-500/40"

const selectTriggerClass =
  "bg-background border-border text-foreground h-11 rounded-xl focus:ring-red-500/40"

function getComision(tipoOperacion, tipoCliente, ganancia) {
  if (!tipoOperacion || !tipoCliente || !ganancia) return 0
  const tabla = comisiones[tipoOperacion]?.[tipoCliente]
  if (!tabla) return 0
  const tramo = tabla.find((t) => ganancia >= t.min && ganancia <= t.max)
  return tramo ? tramo.valor : 0
}

/**
 * @param {string} cbu
 */
function normalizeCbuDigits(cbu) {
  return String(cbu ?? "").replace(/\D/g, "")
}

/**
 * @param {string} idGbp
 */
function normalizeIdGbpKey(idGbp) {
  return String(idGbp ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

/**
 * @param {typeof EMPTY_FORM} form
 */
function validarFormulario(form) {
  if (!normalizeIdGbpKey(form.idGbp)) {
    window.alert("El ID GBP es obligatorio.")
    return false
  }

  if (!form.cuit.trim()) {
    window.alert("El CUIT es obligatorio.")
    return false
  }

  if (form.tipoAcreditacion === TIPO_ACREDITACION.TRANSFERENCIA) {
    if (!form.banco.trim()) {
      window.alert("El banco es obligatorio para acreditación por transferencia.")
      return false
    }
    if (normalizeCbuDigits(form.cbu).length !== 22) {
      window.alert("El CBU debe tener 22 dígitos.")
      return false
    }
  }

  return true
}

/**
 * @param {typeof EMPTY_FORM} form
 * @param {Record<string, unknown>} calculated
 */
function buildPayloadOperacion(form, calculated) {
  const tipoAcreditacion = form.tipoAcreditacion || TIPO_ACREDITACION.CUENTA_GN
  const idGbp = normalizeIdGbpKey(form.idGbp)
  const base = {
    ...form,
    ...calculated,
    tipoAcreditacion,
    idGbp,
  }

  if (tipoAcreditacion === TIPO_ACREDITACION.CUENTA_GN) {
    return { ...base, banco: null, cbu: null }
  }

  return {
    ...base,
    banco: form.banco.trim(),
    cbu: normalizeCbuDigits(form.cbu),
  }
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatMoney(value) {
  return `$ ${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * @param {unknown} fecha
 * @returns {string}
 */
function formatHistorialFecha(fecha) {
  if (!fecha) return "—"
  if (
    typeof fecha === "object" &&
    fecha !== null &&
    "toDate" in fecha &&
    typeof /** @type {{ toDate: () => Date }} */ (fecha).toDate === "function"
  ) {
    return /** @type {{ toDate: () => Date }} */ (fecha)
      .toDate()
      .toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
  }
  return String(fecha)
}

/**
 * @param {{ title: string; icon: import("lucide-react").LucideIcon; children: import("react").ReactNode }} props
 */
function FormSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Icon className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">{children}</div>
    </section>
  )
}

/**
 * @param {{ label: string; value: string; highlight?: boolean; accent?: boolean }} props
 */
function BreakdownRow({ label, value, highlight = false, accent = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
        highlight
          ? "border border-red-500/30 bg-red-500/10"
          : "border border-border bg-background/80"
      }`}
    >
      <span className={`text-sm ${highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          accent ? "text-red-400" : highlight ? "text-red-300 text-lg" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * @param {{ label: string; name: string; value: string; onChange: (e: import("react").ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string; className?: string; inputMode?: import("react").HTMLAttributes<HTMLInputElement>["inputMode"] }} props
 */
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  inputMode,
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        className={inputClass}
      />
    </div>
  )
}

/**
 * @param {{ label: string; value: string; className?: string }} props
 */
function CalculatedField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
        {label}
      </Label>
      <div className="flex h-11 items-center rounded-xl border border-border bg-muted/60 px-4 text-sm font-semibold text-foreground tabular-nums">
        {value}
      </div>
    </div>
  )
}

export default function CuentaOrdenCalculator() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [historial, setHistorial] = useState([])
  const [saving, setSaving] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "cbu"
          ? value.replace(/\D/g, "").slice(0, 22)
          : name === "idGbp"
            ? value.toUpperCase()
            : value,
    }))
  }

  const handleTipoAcreditacionChange = (value) => {
    setForm((prev) => ({
      ...prev,
      tipoAcreditacion: value,
      ...(value === TIPO_ACREDITACION.CUENTA_GN ? { banco: "", cbu: "" } : {}),
    }))
  }

  const esTransferencia =
    form.tipoAcreditacion === TIPO_ACREDITACION.TRANSFERENCIA

  const ganancia = parseFloat(form.ganancia || "0")
  const proforma = parseFloat(form.proforma || "0")
  const percepciones = parseFloat(form.percepciones || "0")

  const comisionPorcentaje = getComision(
    form.tipoOperacion,
    form.tipoCliente,
    ganancia
  )

  const importeFacturaFinal = proforma
  const importeFacturaSinIibb = importeFacturaFinal - percepciones
  const importeOperacion = importeFacturaSinIibb
  const costoGN = ganancia > 0 ? importeOperacion / (1 + ganancia / 100) : 0
  const comisionGastoFc = importeOperacion * comisionPorcentaje
  const margen = importeOperacion - costoGN
  const montoAcreditar = margen - comisionGastoFc

  const payloadOperacion = useMemo(
    () =>
      buildPayloadOperacion(form, {
        proforma,
        importeFacturaFinal,
        percepciones,
        importeFacturaSinIibb,
        importeOperacion,
        costoGN,
        comisionPorcentaje,
        comisionGastoFc,
        margen,
        montoAcreditar,
      }),
    [
      form,
      proforma,
      importeFacturaFinal,
      percepciones,
      importeFacturaSinIibb,
      importeOperacion,
      costoGN,
      comisionPorcentaje,
      comisionGastoFc,
      margen,
      montoAcreditar,
    ]
  )

  const historialKey = normalizeIdGbpKey(form.idGbp)

  useEffect(() => {
    if (!historialKey) {
      setHistorial([])
      return
    }

    const ref = collection(db, "cuenta_orden", historialKey, "historial")
    const q = query(ref, orderBy("fecha", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistorial(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      )
    })

    return () => unsubscribe()
  }, [historialKey])

  const guardarOperacion = async () => {
    if (!validarFormulario(form)) return

    setSaving(true)
    try {
      const ref = collection(db, "cuenta_orden", historialKey, "historial")
      await addDoc(ref, {
        ...payloadOperacion,
        fecha: serverTimestamp(),
      })
      window.alert("Operación guardada correctamente.")
    } catch (error) {
      console.error(error)
      window.alert("Error al guardar la operación.")
    } finally {
      setSaving(false)
    }
  }

  const generarPDF = async () => {
    if (!validarFormulario(form)) return

    try {
      await generateCuentaOrdenResumenPdf({
        cliente: form.cliente,
        clienteGN: form.clienteGN,
        idGbp: historialKey,
        cuit: form.cuit,
        accion: form.accion,
        importeFacturaFinal,
        percepciones,
        importeFacturaSinIibb,
        costoGN,
        comisionPorcentaje,
        comisionGastoFc,
        margen,
        montoAcreditar,
      })
    } catch (error) {
      console.error("[Cuenta y Orden] PDF", error)
      window.alert("No se pudo generar el PDF. Intente nuevamente.")
    }
  }

  const limpiarFormulario = () => {
    setForm(EMPTY_FORM)
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-red-400/80 mb-2">
          Operaciones financieras
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Cuenta y Orden
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cálculo operativo, acreditación y registro por cliente Núcleo (ID GBP).
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <FormSection title="Datos del Cliente" icon={User}>
            <Field
              label="CUIT"
              name="cuit"
              value={form.cuit}
              onChange={handleChange}
              placeholder="30715928481"
            />
            <Field
              label="Cliente"
              name="cliente"
              value={form.cliente}
              onChange={handleChange}
              placeholder="Razón social"
            />
            <Field
              label="ID GBP"
              name="idGbp"
              value={form.idGbp}
              onChange={handleChange}
              placeholder="Identificador GBP"
            />
            <Field
              label="Cliente GN"
              name="clienteGN"
              value={form.clienteGN}
              onChange={handleChange}
              placeholder="Nombre cliente Núcleo"
            />
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
                Tipo de acreditación
              </Label>
              <Select
                value={form.tipoAcreditacion}
                onValueChange={handleTipoAcreditacionChange}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value={TIPO_ACREDITACION.CUENTA_GN}>
                    Cuenta GN
                  </SelectItem>
                  <SelectItem value={TIPO_ACREDITACION.TRANSFERENCIA}>
                    Transferencia
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`md:col-span-2 grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
                esTransferencia
                  ? "grid-rows-[1fr] opacity-100 mt-0"
                  : "grid-rows-[0fr] opacity-0 -mt-4"
              }`}
              aria-hidden={!esTransferencia}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Banco"
                    name="banco"
                    value={form.banco}
                    onChange={handleChange}
                    placeholder="Nombre del banco"
                  />
                  <Field
                    label="CBU"
                    name="cbu"
                    value={form.cbu}
                    onChange={handleChange}
                    placeholder="22 dígitos"
                    type="text"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Datos de la Operación" icon={FileText}>
            <Field
              label="Importe de factura final"
              name="proforma"
              type="number"
              value={form.proforma}
              onChange={handleChange}
            />
            <CalculatedField
              label="Importe factura sin IIBB"
              value={formatMoney(importeFacturaSinIibb)}
            />
            <Field
              label="Percepciones"
              name="percepciones"
              type="number"
              value={form.percepciones}
              onChange={handleChange}
            />
            <Field
              label="% Ganancia"
              name="ganancia"
              type="number"
              value={form.ganancia}
              onChange={handleChange}
            />
          </FormSection>

          <FormSection title="Configuración" icon={Settings2}>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
                Tipo Cliente
              </Label>
              <Select
                value={form.tipoCliente || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, tipoCliente: value }))
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="sinFactura">Sin Factura</SelectItem>
                  <SelectItem value="inscripto">Inscripto</SelectItem>
                  <SelectItem value="monotributo">Monotributista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1.5 block">
                Tipo Operación
              </Label>
              <Select
                value={form.tipoOperacion || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, tipoOperacion: value }))
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="tarjeta">Con Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Field
              label="Acción"
              name="accion"
              value={form.accion}
              onChange={handleChange}
              className="md:col-span-2"
            />
          </FormSection>

          <section className="rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Historial del cliente
                </h2>
              </div>
              {historialKey && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  ID GBP {historialKey} · {historial.length} operación
                  {historial.length === 1 ? "" : "es"}
                </span>
              )}
            </div>

            <div className="p-5">
              {!historialKey ? (
                <DashboardEmptyState
                  title="Ingresá el ID GBP"
                  description="El historial se agrupa por cliente Núcleo. Completá el ID GBP para cargar las operaciones guardadas."
                  className="py-8"
                />
              ) : historial.length === 0 ? (
                <DashboardEmptyState
                  title="Sin operaciones registradas"
                  description="Guardá la primera operación para este ID GBP y aparecerá en el historial."
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                        <th className="px-4 py-3 font-semibold">Factura final</th>
                        <th className="px-4 py-3 font-semibold">Margen</th>
                        <th className="px-4 py-3 font-semibold text-right">Acreditar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-border hover:bg-accent/40"
                        >
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {formatHistorialFecha(item.fecha)}
                          </td>
                          <td className="px-4 py-3 text-foreground tabular-nums">
                            {formatMoney(Number(item.proforma ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">
                            {formatMoney(Number(item.margen ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-300 tabular-nums">
                            {formatMoney(Number(item.montoAcreditar ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <BadgeDollarSign className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Resumen financiero
              </h2>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-transparent px-5 py-5 mb-4">
              <p className="text-xs uppercase tracking-wider text-red-300/80 mb-2">
                Monto a acreditar
              </p>
              <p className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                {formatMoney(montoAcreditar)}
              </p>
            </div>

            <div className="space-y-2.5">
              <BreakdownRow
                label="Importe factura sin IIBB"
                value={formatMoney(importeFacturaSinIibb)}
              />
              <BreakdownRow label="Costo GN" value={formatMoney(costoGN)} />
              <BreakdownRow label="Margen" value={formatMoney(margen)} />
              <BreakdownRow
                label="Comisión aplicada"
                value={`${(comisionPorcentaje * 100).toFixed(2)}% · ${formatMoney(comisionGastoFc)}`}
                accent
              />
              <BreakdownRow
                label="Monto a acreditar"
                value={formatMoney(montoAcreditar)}
                highlight
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <DashboardButton
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              disabled={saving}
              onClick={guardarOperacion}
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando…" : "Guardar operación"}
            </DashboardButton>
            <DashboardButton
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={generarPDF}
            >
              <FileDown className="h-4 w-4" />
              Generar PDF
            </DashboardButton>
            <DashboardButton
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={limpiarFormulario}
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar formulario
            </DashboardButton>
          </div>

          <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Landmark className="h-3.5 w-3.5" />
              <span className="font-medium">Referencia operativa</span>
            </div>
            Factura final − percepciones = importe sin IIBB. El margen y la comisión
            determinan el monto final a acreditar.
          </div>
        </aside>
      </div>
    </div>
  )
}

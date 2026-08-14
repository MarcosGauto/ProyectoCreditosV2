"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Building2, Check, FileSearch, Loader2, Search } from "lucide-react"

import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { fetchBcraByCuit } from "@/lib/fetchBcra"
import { saveBcraData, saveBcraError } from "@/lib/bcraStorage"

const formSchema = z.object({
  cuit: z
    .string()
    .length(11, "El CUIT debe tener 11 dígitos")
    .regex(/^[0-9]+$/, "El CUIT solo debe contener números"),
})

const SYSTEM_CAPABILITIES = [
  "Situación BCRA",
  "Informe NOSIS",
  "Balance Contable",
  "IVA e IIBB",
  "Análisis Crediticio",
]

const HERO_ICONS = [
  { Icon: Building2, label: "Empresa" },
  { Icon: Search, label: "Búsqueda" },
  { Icon: FileSearch, label: "Análisis" },
]

export function CuitForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cuit: "",
    },
  })

  async function onSubmit(values) {
    setLoading(true)

    try {
      const result = await fetchBcraByCuit(values.cuit)

      if (!result.ok) {
        const isNotFound = result.status === 404
        const message =
          result.error?.message ||
          result.error?.error ||
          (isNotFound
            ? "CUIT no encontrado en el Central de Deudores."
            : "No se pudo consultar el BCRA. Intentá nuevamente.")

        saveBcraError(values.cuit, {
          error: result.error?.error,
          message,
          code: result.error?.code,
        })

        toast({
          variant: "destructive",
          title: isNotFound
            ? "CUIT no encontrado en BCRA"
            : "Error al consultar BCRA",
          description: `${message} Podés continuar con la calificación e intentar actualizar el BCRA después.`,
        })

        router.push(`/dashboard/analysis/${values.cuit}`)
        return
      }

      saveBcraData(values.cuit, result.data ?? {})

      toast({
        title: "Consulta exitosa",
        description: "Datos del BCRA obtenidos correctamente.",
      })

      router.push(`/dashboard/analysis/${values.cuit}`)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error de red al contactar el servidor."

      saveBcraError(values.cuit, {
        error: "Error de red",
        message,
        code: "NETWORK_ERROR",
      })

      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: `${message} Podés continuar con la calificación e intentar actualizar el BCRA después.`,
      })

      router.push(`/dashboard/analysis/${values.cuit}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[550px] px-4">
      <div className="animate-in fade-in-0 slide-in-from-bottom-5 rounded-2xl border border-border bg-card p-8 shadow-card duration-700 [animation-fill-mode:both]">
        <div className="mb-6 flex items-center justify-center gap-3">
          {HERO_ICONS.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
              title={label}
            >
              <Icon className="h-5 w-5" />
            </div>
          ))}
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Calificación Crediticia
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Consultá un CUIT para iniciar el análisis financiero, fiscal y comercial.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="cuit"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Ej: 30715928481"
                      inputMode="numeric"
                      autoComplete="off"
                      className="h-12 bg-muted text-base tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />

            <DashboardButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="h-12 w-full text-sm font-semibold shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando BCRA…
                </>
              ) : (
                "Iniciar análisis"
              )}
            </DashboardButton>
          </form>
        </Form>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-4 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            Capacidades del sistema
          </p>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SYSTEM_CAPABILITIES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <Check className="h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

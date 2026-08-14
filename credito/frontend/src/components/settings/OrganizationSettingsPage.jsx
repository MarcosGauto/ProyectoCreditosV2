"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Settings2 } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings"
import { ScoreSettingsTab } from "@/components/settings/tabs/ScoreSettingsTab"
import { LimitSettingsTab } from "@/components/settings/tabs/LimitSettingsTab"
import { AlertsSettingsTab } from "@/components/settings/tabs/AlertsSettingsTab"
import { DocumentationSettingsTab } from "@/components/settings/tabs/DocumentationSettingsTab"
import { AiSettingsTab } from "@/components/settings/tabs/AiSettingsTab"
import { HelpCenterTab } from "@/components/settings/help/HelpCenterTab"

/** @typedef {"score" | "limit" | "alerts" | "documentation" | "ai" | "help"} SettingsTabId */

const TABS = /** @type {Array<{ id: SettingsTabId; label: string }>} */ ([
  { id: "score", label: "Score" },
  { id: "limit", label: "Límite" },
  { id: "alerts", label: "Alertas" },
  { id: "documentation", label: "Documentación" },
  { id: "ai", label: "IA" },
  { id: "help", label: "Centro de Ayuda" },
])

function formatSavedAt(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es-AR")
}

/**
 * Pantalla de Ajustes SC-1.0 con persistencia Firestore.
 * La pestaña Centro de Ayuda es solo lectura (docs/).
 */
export function OrganizationSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState(/** @type {SettingsTabId} */ ("score"))
  const [helpFocus, setHelpFocus] = useState(
    /** @type {{ docId: string | null; section: string | null }} */ ({
      docId: null,
      section: null,
    })
  )

  const {
    draft,
    activeProfile,
    loading,
    saving,
    error,
    dirty,
    updateActiveProfile,
    updateOrganization,
    cancel,
    reset,
    validateModule,
    validateOrganization,
    save,
  } = useOrganizationSettings({
    userEmail: user?.email ?? null,
  })

  const validationTab = tab === "help" ? "score" : tab
  const moduleValidation = useMemo(
    () =>
      tab === "help"
        ? { valid: true, errors: [], warnings: [] }
        : validateModule(validationTab),
    [validateModule, tab, validationTab]
  )
  const orgValidation = useMemo(
    () => validateOrganization(),
    [validateOrganization]
  )

  const saveBlockedErrors = [
    ...moduleValidation.errors,
    ...orgValidation.errors.filter(
      (e) =>
        !moduleValidation.errors.some(
          (m) => m.code === e.code && m.path === e.path
        )
    ),
  ]

  const canSave =
    dirty &&
    moduleValidation.valid &&
    orgValidation.valid &&
    !saving &&
    !loading &&
    tab !== "help"

  const handleSave = async () => {
    try {
      const ok = await save()
      if (ok) {
        toast({
          title: "Ajustes guardados",
          description: "OrganizationSettings persistido en Firestore.",
        })
      } else if (dirty) {
        toast({
          title: "No se pudo guardar",
          description: "Revisá los errores de validación.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error al guardar",
        description: "No se pudo escribir OrganizationSettings en Firestore.",
        variant: "destructive",
      })
    }
  }

  const handleRestore = () => {
    reset()
    toast({
      title: "Valores por defecto restaurados",
      description: "Quedaron en borrador. Guardá para persistir en Firestore.",
    })
  }

  const handleCancel = () => {
    cancel()
    toast({
      title: "Cambios descartados",
      description: "Se restauró la última versión guardada.",
    })
  }

  /**
   * @param {{ docId: string; section: string }} payload
   */
  const handleOpenHelp = (payload) => {
    setHelpFocus({ docId: payload.docId, section: payload.section })
    setTab("help")
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando Ajustes SC-1.0…
      </div>
    )
  }

  if (!draft || !activeProfile) {
    return (
      <div className="text-muted-foreground p-8 space-y-3">
        <p>No se pudo cargar OrganizationSettings.</p>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    )
  }

  const sharedTabProps = {
    validation: {
      valid: moduleValidation.valid && orgValidation.valid,
      errors: saveBlockedErrors,
      warnings: [...moduleValidation.warnings, ...orgValidation.warnings],
    },
    onSave: () => void handleSave(),
    onRestore: handleRestore,
    onCancel: handleCancel,
    canSave,
    isDirty: dirty,
    saving,
    onOpenHelp: handleOpenHelp,
  }

  return (
    <div className="text-foreground space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Settings2 className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Ajustes SC-1.0</h1>
            {dirty ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                Cambios sin guardar
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configuración de política crediticia (
            <code className="text-foreground/80">organization_settings</code>
            ). Persistida en Firestore. No afecta todavía el cálculo de Score ni
            Límite.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Org: {draft.meta.organizationId} · Perfil: {activeProfile.meta.name}{" "}
            · v{draft.meta.version} · Actualizado:{" "}
            {formatSavedAt(draft.meta.audit?.updatedAt)} · Por:{" "}
            {draft.meta.audit?.updatedBy ?? "—"}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-1 border-b border-border pb-px"
        role="tablist"
        aria-label="Módulos de Ajustes"
      >
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2.5 text-sm rounded-t-lg transition ${
                active
                  ? "bg-card text-foreground border border-b-0 border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-b-2xl rounded-tr-2xl border border-border bg-card p-5 sm:p-6">
        {tab === "score" ? (
          <ScoreSettingsTab
            profile={activeProfile}
            onChangeProfile={updateActiveProfile}
            {...sharedTabProps}
          />
        ) : null}
        {tab === "limit" ? (
          <LimitSettingsTab
            profile={activeProfile}
            onChangeProfile={updateActiveProfile}
            {...sharedTabProps}
          />
        ) : null}
        {tab === "alerts" ? (
          <AlertsSettingsTab
            profile={activeProfile}
            onChangeProfile={updateActiveProfile}
            {...sharedTabProps}
          />
        ) : null}
        {tab === "documentation" ? (
          <DocumentationSettingsTab
            profile={activeProfile}
            onChangeProfile={updateActiveProfile}
            {...sharedTabProps}
          />
        ) : null}
        {tab === "ai" ? (
          <AiSettingsTab
            ai={draft.ai}
            onChangeAi={(updater) =>
              updateOrganization((doc) => {
                doc.ai = updater(doc.ai)
                return doc
              })
            }
            {...sharedTabProps}
          />
        ) : null}
        {tab === "help" ? (
          <HelpCenterTab
            initialDocId={helpFocus.docId}
            initialSection={helpFocus.section}
          />
        ) : null}
      </div>
    </div>
  )
}

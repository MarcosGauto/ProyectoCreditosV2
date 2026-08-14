"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SucursalPhotoCarousel } from "@/components/financialAnalysis/SucursalPhotoCarousel"
import { mergeSucursalesFromFirestore } from "@/lib/sucursalesModel"
import {
  saveSucursalesMetadata,
  uploadSucursalPhotos,
} from "@/lib/saveSucursales"

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   localesDocs?: unknown[];
 *   usuario?: string | null;
 *   onUpdated?: () => void;
 * }} props
 */
export function SucursalesGallery({
  cuit,
  empresa = null,
  localesDocs = [],
  usuario = null,
  onUpdated,
}) {
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [sucursales, setSucursales] = useState(() =>
    mergeSucursalesFromFirestore(empresa, localesDocs)
  )
  const [activeId, setActiveId] = useState(
    () => mergeSucursalesFromFirestore(empresa, localesDocs)[0]?.id ?? "central"
  )
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null))
  const [draft, setDraft] = useState({ direccion: "", observaciones: "" })
  const [uploading, setUploading] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [error, setError] = useState("")
  const [lightbox, setLightbox] = useState(
    /** @type {{ sucursalId: string; index: number } | null} */ (null)
  )

  const useTabs = sucursales.length > 1

  useEffect(() => {
    const merged = mergeSucursalesFromFirestore(empresa, localesDocs)
    setSucursales(merged)
    setActiveId((prev) =>
      merged.some((s) => s.id === prev) ? prev : merged[0]?.id ?? "central"
    )
  }, [empresa, localesDocs, cuit])

  const activeSucursal = useMemo(
    () => sucursales.find((s) => s.id === activeId) ?? sucursales[0],
    [sucursales, activeId]
  )

  const persistSucursales = useCallback(
    async (next) => {
      setSavingMeta(true)
      setError("")
      try {
        await saveSucursalesMetadata(cuit, next)
        setSucursales(next)
        onUpdated?.()
      } catch (err) {
        console.error(err)
        setError("No se pudieron guardar los datos de la sucursal.")
      } finally {
        setSavingMeta(false)
      }
    },
    [cuit, onUpdated]
  )

  const startEdit = (sucursal) => {
    setEditingId(sucursal.id)
    setDraft({
      direccion: sucursal.direccion,
      observaciones: sucursal.observaciones,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft({ direccion: "", observaciones: "" })
  }

  const saveEdit = async () => {
    if (!editingId) {
      return
    }
    const next = sucursales.map((s) =>
      s.id === editingId
        ? {
            ...s,
            direccion: draft.direccion.trim(),
            observaciones: draft.observaciones.trim(),
          }
        : s
    )
    await persistSucursales(next)
    cancelEdit()
  }

  const uploadTargetRef = useRef(/** @type {string | null} */ (null))

  const handleAddPhotos = (sucursalId) => {
    uploadTargetRef.current = sucursalId
    setActiveId(sucursalId)
    fileInputRef.current?.click()
  }

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    const targetId = uploadTargetRef.current ?? activeSucursal?.id
    if (!files.length || !targetId) {
      return
    }

    setUploading(true)
    setError("")
    try {
      const uploaded = await uploadSucursalPhotos({
        cuit,
        sucursalId: targetId,
        files,
        usuario,
      })

      const next = sucursales.map((s) =>
        s.id === targetId
          ? { ...s, fotos: [...s.fotos, ...uploaded] }
          : s
      )
      await persistSucursales(next)
    } catch (err) {
      console.error(err)
      setError("Error al subir las fotos.")
    } finally {
      setUploading(false)
    }
  }

  const goLightbox = (direction) => {
    if (!lightbox) {
      return
    }
    const sucursal = sucursales.find((s) => s.id === lightbox.sucursalId)
    if (!sucursal?.fotos.length) {
      return
    }
    const total = sucursal.fotos.length
    const nextIndex =
      direction === "next"
        ? (lightbox.index + 1) % total
        : (lightbox.index - 1 + total) % total
    setLightbox({ ...lightbox, index: nextIndex })
  }

  const renderSucursalCard = (sucursal) => {
    const isEditing = editingId === sucursal.id
    const fotoCount = sucursal.fotos.length

    return (
      <div className="rounded-2xl border border-border bg-muted/80 p-4 md:p-5 transition-colors hover:border-border">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h4 className="text-base font-bold text-foreground">{sucursal.nombre}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {fotoCount} {fotoCount === 1 ? "imagen" : "imágenes"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => handleAddPhotos(sucursal.id)}
              disabled={uploading}
            >
              {uploading && uploadTargetRef.current === sucursal.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Camera className="w-3.5 h-3.5 mr-1" />
              )}
              Agregar fotos
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                isEditing ? cancelEdit() : startEdit(sucursal)
              }
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              {isEditing ? "Cancelar" : "Editar datos"}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
              <Input
                value={draft.direccion}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, direccion: e.target.value }))
                }
                placeholder="Dirección de la sucursal"
                className="h-10 border-border bg-background/40 text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Observaciones (opcional)
              </label>
              <textarea
                value={draft.observaciones}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, observaciones: e.target.value }))
                }
                placeholder="Observaciones del local..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y min-h-[72px]"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={saveEdit}
              disabled={savingMeta}
            >
              {savingMeta ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Guardar datos
            </Button>
          </div>
        ) : (
          <div className="space-y-1 mb-4 text-sm">
            {sucursal.direccion ? (
              <p className="text-foreground/80">{sucursal.direccion}</p>
            ) : (
              <p className="text-muted-foreground italic">Sin dirección cargada</p>
            )}
            {sucursal.observaciones ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {sucursal.observaciones}
              </p>
            ) : null}
          </div>
        )}

        <SucursalPhotoCarousel
          fotos={sucursal.fotos}
          sucursalNombre={sucursal.nombre}
          onPhotoClick={(index) =>
            setLightbox({ sucursalId: sucursal.id, index })
          }
        />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <div>
          <span className="font-semibold text-sm text-foreground">Locales y sucursales</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Galería por sucursal · múltiples fotos por local
          </p>
        </div>
      </div>

      <div className="p-4 md:p-5">
        {error && (
          <p className="text-sm text-red-400 mb-3">{error}</p>
        )}

        {useTabs ? (
          <Tabs
            value={activeId}
            onValueChange={setActiveId}
            className="w-full"
          >
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="inline-flex h-auto min-w-full w-max gap-1 bg-muted border border-border p-1 rounded-xl">
                {sucursales.map((s) => (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className="text-xs sm:text-sm px-3 py-2 rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white text-muted-foreground"
                  >
                    {s.nombre}
                    {s.fotos.length > 0 && (
                      <span className="ml-1.5 opacity-70 tabular-nums">
                        ({s.fotos.length})
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {sucursales.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-4">
                {renderSucursalCard(s)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1">
            {activeSucursal && renderSucursalCard(activeSucursal)}
          </div>
        )}

        {/* Tablet: grid 2 cols preview when multiple - show all as cards stacked on mobile, 2 on md */}
        {useTabs && sucursales.length > 1 && (
          <div className="hidden md:grid xl:hidden md:grid-cols-2 gap-4 mt-6">
            {sucursales
              .filter((s) => s.id !== activeId)
              .slice(0, 2)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className="text-left rounded-xl border border-border p-3 hover:border-red-500/40 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{s.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.fotos.length} imágenes · Ver
                  </p>
                </button>
              ))}
          </div>
        )}
      </div>

      {lightbox && (() => {
        const sucursal = sucursales.find((s) => s.id === lightbox.sucursalId)
        const foto = sucursal?.fotos[lightbox.index]
        if (!foto) {
          return null
        }
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
            onClick={() => setLightbox(null)}
          >
            <div
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute -top-10 right-0 text-foreground/80 hover:text-foreground flex items-center gap-1 text-sm"
              >
                <X className="w-4 h-4" /> Cerrar
              </button>
              {sucursal.fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goLightbox("prev")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/60 text-foreground flex items-center justify-center"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => goLightbox("next")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/60 text-foreground flex items-center justify-center"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
              <img
                src={foto.url}
                alt={sucursal.nombre}
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {sucursal.nombre} · {lightbox.index + 1} / {sucursal.fotos.length}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

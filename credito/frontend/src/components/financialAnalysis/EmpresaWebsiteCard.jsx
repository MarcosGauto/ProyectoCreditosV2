"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getEmpresaWebsiteUrl } from "@/lib/empresaWebsite"
import { saveEmpresaWebsite } from "@/lib/saveEmpresaWebsite"

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   onUpdated?: (result: { paginaWeb: string; cuit: string }) => void | Promise<void>;
 * }} props
 */
export function EmpresaWebsiteCard({ cuit, empresa = null, onUpdated }) {
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setUrl(getEmpresaWebsiteUrl(empresa) ?? "")
  }, [empresa, cuit])

  const storedUrl = getEmpresaWebsiteUrl(empresa)

  const handleSave = useCallback(async () => {
    if (!cuit) {
      return
    }
    setSaving(true)
    setError("")
    try {
      const result = await saveEmpresaWebsite(cuit, url)
      await onUpdated?.(result)
    } catch (err) {
      console.error("[EmpresaWebsiteCard]", err)
      setError("No se pudo guardar el sitio web.")
    } finally {
      setSaving(false)
    }
  }, [cuit, url, onUpdated])

  return (
    <div className="bg-card border border-border rounded-3xl shadow-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-bold text-foreground text-lg">Sitio web</h3>
        <span className="text-muted-foreground text-xs font-normal">(opc.)</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          placeholder="https://www.empresa.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => void handleSave()}
          disabled={saving || !url.trim()}
          className="shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Guardar
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {storedUrl && (
        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
          La URL confirmada se muestra en la tarjeta Web del panel principal.
        </p>
      )}
    </div>
  )
}

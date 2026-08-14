"use client"

/**
 * @param {{ label: string; value: unknown }} props
 */
function SociedadMetricRow({ label, value }) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-semibold text-foreground tabular-nums break-words text-right max-w-[70%]">
        {String(value)}
      </span>
    </div>
  )
}

/**
 * @param {{ entry: import("@/lib/nosisModel").NosisSociedadEntry; index: number }} props
 */
function SociedadCard({ entry }) {
  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-2">
      {entry.razonSocial && (
        <p className="text-sm font-semibold text-foreground break-words">
          {entry.razonSocial}
        </p>
      )}

      <SociedadMetricRow label="Fecha publicación" value={entry.fechaPublicacion} />
      <SociedadMetricRow label="Constitución" value={entry.constitucion} />
      <SociedadMetricRow label="Domicilio" value={entry.domicilio} />
      <SociedadMetricRow label="Fuente" value={entry.fuente} />

      {entry.detalle && (
        <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border">
          {entry.detalle}
        </p>
      )}
    </div>
  )
}

/**
 * @param {{ parsedData: Record<string, unknown> | null | undefined }} props
 */
export function NosisDetectedInfo({ parsedData }) {
  const sociedades = Array.isArray(parsedData?.sociedades)
    ? /** @type {import("@/lib/nosisModel").NosisSociedadEntry[]} */ (
        parsedData.sociedades
      )
    : []

  if (sociedades.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sociedades
      </p>
      {sociedades.map((entry, index) => (
        <SociedadCard key={`sociedad-${index}`} entry={entry} />
      ))}
    </div>
  )
}

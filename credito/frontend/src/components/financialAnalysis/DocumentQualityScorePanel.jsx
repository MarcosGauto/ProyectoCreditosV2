"use client"

/**
 * @param {{
 *   quality: import("@/lib/documentQualityScore").DocumentQualityScoreResult | null;
 * }} props
 */
export function DocumentQualityScorePanel({ quality }) {
  if (!quality) {
    return null
  }

  const { score, maxScore, breakdown } = quality

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-100">Calidad documental</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Indicador informativo para el analista. No afecta la calificación crediticia.
        </p>
      </div>

      <p className="text-2xl font-black text-foreground tabular-nums">
        {score} / {maxScore}
      </p>

      <ul className="space-y-1.5 text-sm">
        {breakdown.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 text-foreground/80"
          >
            <span>{item.label}</span>
            <span className="tabular-nums text-muted-foreground shrink-0">
              {String(item.points).padStart(2, " ")} / {item.maxPoints} pts
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

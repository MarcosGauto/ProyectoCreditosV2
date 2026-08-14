/**
 * Render docs/SC1_BASELINE_REPORT.md from baseline stats (no policy changes).
 */

/**
 * @param {ReturnType<import('./buildSc1BaselineStats.mjs').buildSc1BaselineStats>} stats
 * @returns {string}
 */
export function renderSc1BaselineReportMarkdown(stats) {
  const { meta } = stats
  const lines = []
  const p = (s = "") => lines.push(s)

  p("# SC-1.0 — Baseline Report")
  p("")
  p(`**Generated at:** ${meta.generatedAt}`)
  p(`**Dataset:** ${meta.datasetLabel}`)
  p(`**Data status:** \`${meta.dataStatus}\``)
  p(`**Cases (published SC-1 snapshots):** ${meta.caseCount}`)
  p(`**Model:** ${meta.model}`)
  p("")
  p(
    "> Solo análisis estadístico descriptivo. No modifica política ni propone pesos nuevos."
  )
  p("")
  if (meta.dataStatus === "PENDING_REAL_EXPORT") {
    p("## Estado del dataset")
    p("")
    p(
      "Aún **no** hay export de versiones publicadas de producción. Este reporte se genera sobre el dataset indicado (`datasetLabel`) para validar la infraestructura."
    )
    p("")
    p("Para baseline de producción:")
    p("")
    p("```powershell")
    p("Set-Location credito\\frontend")
    p(
      "npm run calibrate:sc1 -- --input path\\to\\published-versions.json --outDir scripts\\sc1-calibration\\out --baseline --docsBaseline"
    )
    p("```")
    p("")
  }

  p("## 1. Distribución del Score")
  p("")
  const ss = stats.scoreDistribution.summary
  p(`n=${ss.n} · min=${ss.min} · max=${ss.max} · mean=${ss.mean} · p50=${ss.p50} · stdev=${ss.stdev}`)
  p("")
  p("| Band | Count | % |")
  p("|------|------:|--:|")
  for (const b of stats.scoreDistribution.byCategoryBand) {
    p(`| ${b.key} | ${b.count} | ${b.pct} |`)
  }
  p("")

  p("## 2. Distribución por Categoría")
  p("")
  p("| Category | Count | % |")
  p("|----------|------:|--:|")
  for (const c of stats.categoryDistribution) {
    p(`| ${c.key} | ${c.count} | ${c.pct} |`)
  }
  p("")

  p("## 3. Distribución por Confidence")
  p("")
  const cs = stats.confidenceDistribution.summary
  p(`n=${cs.n} · min=${cs.min} · max=${cs.max} · mean=${cs.mean} · p50=${cs.p50} · stdev=${cs.stdev}`)
  p("")
  p("| Level | Count | % |")
  p("|-------|------:|--:|")
  for (const c of stats.confidenceDistribution.byLevel) {
    p(`| ${c.key} | ${c.count} | ${c.pct} |`)
  }
  p("")

  p("## 4. % UNKNOWN por dimensión (set activo de 7)")
  p("")
  p("| Dimension | Observed | UNKNOWN/null score | % UNKNOWN | SKIPPED |")
  p("|-----------|--------:|-------------------:|----------:|--------:|")
  for (const id of Object.keys(stats.unknownByDimension)) {
    const u = stats.unknownByDimension[id]
    p(
      `| ${id} | ${u.observed} | ${u.unknown} | ${u.unknownPct} | ${u.skipped} |`
    )
  }
  p("")

  p("## 5. Top dimensiones por aporte medio (|contribution|)")
  p("")
  p("| Rank | Dimension | n | mean\\|contribution\\| | mean contribution |")
  p("|-----:|-----------|--:|--------------------:|------------------:|")
  stats.topDimensionsByContribution.forEach((d, i) => {
    p(
      `| ${i + 1} | ${d.dimensionId} | ${d.n} | ${d.meanAbsContribution} | ${d.meanContribution} |`
    )
  })
  p("")

  p("## 6. Top reglas disparadas (`matchedRuleId`)")
  p("")
  p("| Rank | Rule ID | Count | % cases |")
  p("|-----:|---------|------:|--------:|")
  stats.topRulesFired.forEach((r, i) => {
    p(`| ${i + 1} | ${r.key} | ${r.count} | ${r.pct} |`)
  })
  if (stats.topRulesFired.length === 0) {
    p("_Sin `matchedRuleId` en los breakdowns del dataset._")
  }
  p("")

  p("## 7. Histogramas")
  p("")
  p("### Score")
  p("")
  p("| Bin | Count | % |")
  p("|-----|------:|--:|")
  for (const b of stats.histograms.score.bins) {
    p(`| ${b.label} | ${b.count} | ${b.pct} |`)
  }
  p("")
  p("### suggestedLimit")
  p("")
  p(`n=${stats.histograms.suggestedLimit.n}`)
  p("")
  p("| Bin | Count | % |")
  p("|-----|------:|--:|")
  for (const b of stats.histograms.suggestedLimit.bins) {
    p(`| ${b.label} | ${b.count} | ${b.pct} |`)
  }
  p("")
  p("### confidence")
  p("")
  p(`n=${stats.histograms.confidence.n}`)
  p("")
  p("| Bin | Count | % |")
  p("|-----|------:|--:|")
  for (const b of stats.histograms.confidence.bins) {
    p(`| ${b.label} | ${b.count} | ${b.pct} |`)
  }
  p("")

  p("## 8. Correlación dimensión.score → sc1Score (Pearson)")
  p("")
  p("| Dimension | n pairs | Pearson r |")
  p("|-----------|--------:|----------:|")
  for (const row of stats.correlationDimToScore) {
    p(
      `| ${row.dimensionId} | ${row.n} | ${row.pearson == null ? "n/a" : row.pearson} |`
    )
  }
  p("")

  p("## 9. Matriz categoría × decisión de límite")
  p("")
  const decisions = stats.categoryDecisionMatrix.decisions
  p(`| Category | ${decisions.join(" | ")} | Total |`)
  p(`|----------|${decisions.map(() => "---:").join("|")}|------:|`)
  for (const row of stats.categoryDecisionMatrix.rows) {
    const cells = decisions.map((d) => row.cells[d] ?? 0).join(" | ")
    p(`| ${row.category} | ${cells} | ${row.rowTotal} |`)
  }
  p("")

  p("## 10. Hallazgos / anomalías / concentraciones")
  p("")
  for (const finding of deriveFindings(stats)) {
    p(`- ${finding}`)
  }
  p("")

  p("## 11. Recomendaciones de calibración (sin pesos nuevos)")
  p("")
  p(
    "Estas recomendaciones son de **proceso / calidad de datos / foco de análisis**, no cambios numéricos de política:"
  )
  p("")
  for (const rec of deriveProcessRecommendations(stats)) {
    p(`- ${rec}`)
  }
  p("")
  p("---")
  p("")
  p(
    "Refs: [SC1_CALIBRATION_PROCESS.md](./SC1_CALIBRATION_PROCESS.md) · [ADR-SC1-SCORE-DIMENSION-MODEL.md](./ADR-SC1-SCORE-DIMENSION-MODEL.md) · [SC1_CUTOVER_PLAN.md](./SC1_CUTOVER_PLAN.md)"
  )
  p("")

  return lines.join("\n")
}

/**
 * @param {ReturnType<import('./buildSc1BaselineStats.mjs').buildSc1BaselineStats>} stats
 */
function deriveFindings(stats) {
  /** @type {string[]} */
  const out = []
  const n = stats.meta.caseCount
  if (n === 0) {
    out.push("Dataset vacío: no hay hallazgos estadísticos.")
    return out
  }

  if (stats.meta.dataStatus === "PENDING_REAL_EXPORT") {
    out.push(
      "Dataset no es export de producción: los hallazgos sirven solo para validar la tubería de baseline."
    )
  }

  const cats = stats.categoryDistribution
  if (cats.length > 0) {
    const top = cats[0]
    if (top.pct >= 40) {
      out.push(
        `Concentración de categoría: **${top.key}** concentra ${top.pct}% de los casos.`
      )
    }
  }

  const bandB = stats.scoreDistribution.byCategoryBand.find((b) =>
    b.key.startsWith("B_0_549")
  )
  if (bandB && bandB.pct >= 40) {
    out.push(
      `Concentración de score en banda B [0–549]: ${bandB.pct}% de scores.`
    )
  }

  for (const [id, u] of Object.entries(stats.unknownByDimension)) {
    if (u.observed > 0 && u.unknownPct >= 30) {
      out.push(
        `Anomalía UNKNOWN: dimensión **${id}** UNKNOWN/null en ${u.unknownPct}% de observaciones (${u.unknown}/${u.observed}).`
      )
    }
  }

  const topDim = stats.topDimensionsByContribution[0]
  if (topDim) {
    out.push(
      `Mayor aporte medio absoluto: **${topDim.dimensionId}** (mean|contribution|=${topDim.meanAbsContribution}).`
    )
  }

  const topRule = stats.topRulesFired[0]
  if (topRule) {
    out.push(
      `Regla más frecuente: \`${topRule.key}\` en ${topRule.count} casos (${topRule.pct}%).`
    )
  }

  const corr = stats.correlationDimToScore.filter((c) => c.pearson != null)
  if (corr.length > 0) {
    const strongest = [...corr].sort(
      (a, b) => Math.abs(b.pearson ?? 0) - Math.abs(a.pearson ?? 0)
    )[0]
    out.push(
      `Correlación más fuerte dim→score: **${strongest.dimensionId}** r=${strongest.pearson} (n=${strongest.n}).`
    )
  }

  const confMean = stats.confidenceDistribution.summary.mean
  if (confMean != null && confMean < 0.85) {
    out.push(
      `Confidence media ${confMean} < 0.85 (umbral hardcode high del Aggregator): pocos casos “Alta” esperables.`
    )
  }

  if (out.length === 1 && stats.meta.dataStatus === "PENDING_REAL_EXPORT") {
    out.push("Sin anomalías adicionales detectables en el dataset de prueba.")
  }

  return out
}

/**
 * @param {ReturnType<import('./buildSc1BaselineStats.mjs').buildSc1BaselineStats>} stats
 */
function deriveProcessRecommendations(stats) {
  /** @type {string[]} */
  const recs = [
    "Congelar un export JSON de versiones publicadas reales y regenerar este reporte antes de cualquier ajuste de Ajustes.",
    "Limitar el baseline y la calibración al set oficial de **7** dimensiones (ADR); ignorar dims reservadas.",
    "Archivar `sc1_baseline_stats.json` junto al CSV de filas por cada cohorte datada.",
  ]

  for (const [id, u] of Object.entries(stats.unknownByDimension)) {
    if (u.observed > 0 && u.unknownPct >= 30) {
      recs.push(
        `Priorizar investigación de datos/reglas para **${id}** (UNKNOWN elevado) antes de mover bandas globales.`
      )
    }
  }

  const top = stats.categoryDistribution[0]
  if (top && top.pct >= 40) {
    recs.push(
      `Documentar con negocio si la concentración en categoría ${top.key} es esperable en la cohorte o síntoma de escala/reglas gruesas.`
    )
  }

  recs.push(
    "No proponer pesos nuevos hasta tener baseline de producción (este ítem queda pendiente a propósito)."
  )

  return recs
}

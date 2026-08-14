# SC-1.0 — Baseline Report

**Generated at:** 2026-07-29T20:26:13.126Z
**Dataset:** fixture:sample-published-versions.json
**Data status:** `PENDING_REAL_EXPORT`
**Cases (published SC-1 snapshots):** 5
**Model:** 7 dimensions active (ADR-SC1-SCORE-DIMENSION-MODEL); reserved dims excluded

> Solo análisis estadístico descriptivo. No modifica política ni propone pesos nuevos.

## Estado del dataset

Aún **no** hay export de versiones publicadas de producción. Este reporte se genera sobre el dataset indicado (`datasetLabel`) para validar la infraestructura.

Para baseline de producción:

```powershell
Set-Location credito\frontend
npm run calibrate:sc1 -- --input path\to\published-versions.json --outDir scripts\sc1-calibration\out --baseline --docsBaseline
```

## 1. Distribución del Score

n=5 · min=480 · max=900 · mean=674 · p50=660 · stdev=165.602

| Band | Count | % |
|------|------:|--:|
| B_0_549 | 2 | 40 |
| A_750_849 | 1 | 20 |
| AA_850_949 | 1 | 20 |
| BBB_650_749 | 1 | 20 |
| AAA_950_1000 | 0 | 0 |
| BB_550_649 | 0 | 0 |

## 2. Distribución por Categoría

| Category | Count | % |
|----------|------:|--:|
| B | 2 | 40 |
| A | 1 | 20 |
| AA | 1 | 20 |
| BBB | 1 | 20 |

## 3. Distribución por Confidence

n=5 · min=0.71 · max=1 · mean=0.914 · p50=1 · stdev=0.116

| Level | Count | % |
|-------|------:|--:|
| high | 4 | 80 |
| medium | 1 | 20 |

## 4. % UNKNOWN por dimensión (set activo de 7)

| Dimension | Observed | UNKNOWN/null score | % UNKNOWN | SKIPPED |
|-----------|--------:|-------------------:|----------:|--------:|
| liquidity | 5 | 0 | 0 | 0 |
| debt | 5 | 0 | 0 | 0 |
| profitability | 5 | 0 | 0 | 0 |
| documentation | 5 | 0 | 0 | 0 |
| bcra | 5 | 0 | 0 | 0 |
| checks | 5 | 0 | 0 | 0 |
| coverage | 5 | 2 | 40 | 0 |

## 5. Top dimensiones por aporte medio (|contribution|)

| Rank | Dimension | n | mean\|contribution\| | mean contribution |
|-----:|-----------|--:|--------------------:|------------------:|
| 1 | liquidity | 5 | 110 | 110 |
| 2 | documentation | 5 | 107.42 | 107.42 |
| 3 | debt | 5 | 75.1 | 75.1 |
| 4 | checks | 5 | 75.06 | 75.06 |
| 5 | profitability | 5 | 73.66 | 73.66 |
| 6 | bcra | 5 | 73.32 | 73.32 |
| 7 | coverage | 3 | 51.567 | 51.567 |

## 6. Top reglas disparadas (`matchedRuleId`)

| Rank | Rule ID | Count | % cases |
|-----:|---------|------:|--------:|
| 1 | checks.eq.0 | 3 | 60 |
| 2 | bcra.eq.1 | 2 | 40 |
| 3 | bcra.eq.2 | 2 | 40 |
| 4 | coverage.con | 2 | 40 |
| 5 | debt.gte.0.7 | 2 | 40 |
| 6 | debt.lte.0.5 | 2 | 40 |
| 7 | liquidity.between.1.2 | 2 | 40 |
| 8 | liquidity.gte.2 | 2 | 40 |
| 9 | profitability.between.0.03.0.1 | 2 | 40 |
| 10 | profitability.lt.0.03 | 2 | 40 |
| 11 | bcra.gte.3 | 1 | 20 |
| 12 | checks.between.1.3 | 1 | 20 |
| 13 | checks.gte.3 | 1 | 20 |
| 14 | coverage.sin | 1 | 20 |
| 15 | debt.between.0.5.0.7 | 1 | 20 |
| 16 | liquidity.lt.1 | 1 | 20 |
| 17 | profitability.gte.0.1 | 1 | 20 |

## 7. Histogramas

### Score

| Bin | Count | % |
|-----|------:|--:|
| B_0_549 [0-549] | 2 | 40 |
| BB_550_649 [550-649] | 0 | 0 |
| BBB_650_749 [650-749] | 1 | 20 |
| A_750_849 [750-849] | 1 | 20 |
| AA_850_949 [850-949] | 1 | 20 |
| AAA_950_1000 [950-1000] | 0 | 0 |

### suggestedLimit

n=5

| Bin | Count | % |
|-----|------:|--:|
| [0, 250000) | 2 | 40 |
| [250000, 500000) | 0 | 0 |
| [500000, 1000000) | 1 | 20 |
| [1000000, 2000000) | 0 | 0 |
| [2000000, 5000000) | 1 | 20 |
| [5000000, 10000000] | 1 | 20 |

### confidence

n=5

| Bin | Count | % |
|-----|------:|--:|
| [0, 0.2) | 0 | 0 |
| [0.2, 0.4) | 0 | 0 |
| [0.4, 0.6) | 0 | 0 |
| [0.6, 0.85) | 1 | 20 |
| [0.85, 1.0001] | 4 | 80 |

## 8. Correlación dimensión.score → sc1Score (Pearson)

| Dimension | n pairs | Pearson r |
|-----------|--------:|----------:|
| debt | 5 | 0.987 |
| profitability | 5 | 0.95 |
| coverage | 3 | 0.945 |
| bcra | 5 | 0.861 |
| liquidity | 5 | 0.861 |
| documentation | 5 | 0.607 |
| checks | 5 | 0.595 |

## 9. Matriz categoría × decisión de límite

| Category | approve_suggested | approve_with_conditions | deny | review_manual | Total |
|----------|---:|---:|---:|---:|------:|
| A | 1 | 0 | 0 | 0 | 1 |
| AA | 1 | 0 | 0 | 0 | 1 |
| B | 0 | 0 | 1 | 1 | 2 |
| BBB | 0 | 1 | 0 | 0 | 1 |

## 10. Hallazgos / anomalías / concentraciones

- Dataset no es export de producción: los hallazgos sirven solo para validar la tubería de baseline.
- Concentración de categoría: **B** concentra 40% de los casos.
- Concentración de score en banda B [0–549]: 40% de scores.
- Anomalía UNKNOWN: dimensión **coverage** UNKNOWN/null en 40% de observaciones (2/5).
- Mayor aporte medio absoluto: **liquidity** (mean|contribution|=110).
- Regla más frecuente: `checks.eq.0` en 3 casos (60%).
- Correlación más fuerte dim→score: **debt** r=0.987 (n=5).

## 11. Recomendaciones de calibración (sin pesos nuevos)

Estas recomendaciones son de **proceso / calidad de datos / foco de análisis**, no cambios numéricos de política:

- Congelar un export JSON de versiones publicadas reales y regenerar este reporte antes de cualquier ajuste de Ajustes.
- Limitar el baseline y la calibración al set oficial de **7** dimensiones (ADR); ignorar dims reservadas.
- Archivar `sc1_baseline_stats.json` junto al CSV de filas por cada cohorte datada.
- Priorizar investigación de datos/reglas para **coverage** (UNKNOWN elevado) antes de mover bandas globales.
- Documentar con negocio si la concentración en categoría B es esperable en la cohorte o síntoma de escala/reglas gruesas.
- No proponer pesos nuevos hasta tener baseline de producción (este ítem queda pendiente a propósito).

---

Refs: [SC1_CALIBRATION_PROCESS.md](./SC1_CALIBRATION_PROCESS.md) · [ADR-SC1-SCORE-DIMENSION-MODEL.md](./ADR-SC1-SCORE-DIMENSION-MODEL.md) · [SC1_CUTOVER_PLAN.md](./SC1_CUTOVER_PLAN.md)

# Release SC-1.0 Platform

**Estado:** congelada / estable  
**Versión recomendada:** `v1.0.0-sc1-platform`  
**Fecha:** 2026-07-29  
**Alcance:** frontend `credito/frontend` — plataforma de Score Propio + Límite sugerido en dual-run, sin cutover del motor legacy.

Este documento marca el **cierre funcional** de la Plataforma SC-1.0. No introduce contratos ni motores nuevos.

---

## Arquitectura final

```
Settings (OrganizationSettings / PolicyProfile)
        │
        ▼ Projection Registry
CreditPolicyDocument ──freeze──► PolicyRevision
LimitPolicy ──────────freeze──► LimitPolicyRevision
        │
        ▼ Dual-run (runSc1Analysis)
   ┌────┴────┐
   │         │
Score Engine    Limit Engine
runOwnCreditScore   runLimitEngine
   │         │
   └────┬────┘
        ▼
  computed.sc1 (en memoria)
        │
        ├─► Cockpit (solo render, flag SHOW_SC1_COMPARISON)
        │
        ▼ Publish
  buildSc1PublishSlice ──► snapshot.sc1
                           summary.sc1*
                           compareIndex.sc1*
        │
        ├─► Historial (snapshot.sc1 / compareIndex.sc1*)
        └─► Cartera (summary.sc1*)
```

### Flujo completo (QA)

```
Analysis (legacy + precal)
  → runSc1Analysis (Settings proyectados + adapters)
    → Score Engine
    → Limit Engine
  → Cockpit (comparación, si flag ON)
  → Publish (serialización única)
  → Historial / Cartera (solo lectura de publicados)
```

---

## Dependencias entre módulos (producción)

| Desde | Hacia | Motivo |
|-------|-------|--------|
| `creditLimit` | `creditScore` | `OwnCreditScoreResult` (solo tipos/DTO) |
| `settings` | `creditLimit` / `creditPolicy/sc1` | proyección + freeze de policies |
| `sc1` | `creditScore`, `creditLimit`, `settings` | orquestación dual-run |
| `creditAnalysis` | — (slice local) | `buildSc1PublishSlice` serializa `computed.sc1` |

**Sin ciclos 2-way** en código de producción.  
Los engines **no** importan UI, Firestore, Settings ni Cockpit.

---

## Responsabilidades por capa

| Capa | Responsabilidad | No hace |
|------|-----------------|---------|
| **Credit Policy / Policy Revision** | Documento + freeze inmutable | Ejecutar score/límite |
| **Rule Engine + Evaluators + Aggregator** | DimensionEvaluation → OwnCreditScoreResult | Persistencia / UI |
| **Score Engine** | `runOwnCreditScore` | Leer balances/BCRA crudos (recibe metrics) |
| **Limit Engine** | `runLimitEngine` | Balances / BCRA / docs |
| **Settings** | Persistencia + validación de Ajustes | Ejecutar motors |
| **Projection Registry** | Settings → CreditPolicy / LimitPolicy | Ejecutar motors |
| **Dual-run (`lib/sc1`)** | Adapters + orquestación | Persistencia |
| **Publish** | Única serialización SC-1 → Firestore | Recalcular score/límite |
| **Cockpit** | Render de `computed.sc1` | Ejecutar motors |
| **Historial** | Leer `snapshot.sc1` / `compareIndex.sc1*` | Recalcular |
| **Cartera** | Leer `summary.sc1*` | Recalcular |

---

## Módulos cerrados

* Credit Policy (`@/lib/creditPolicy/sc1`)
* Policy Revision
* Rule Engine + Evaluators + Aggregator
* Score Engine
* Limit Engine
* Projection Registry
* Settings (UI Ajustes SC-1 + persistencia + proyección)
* Dual Run (`runSc1Analysis` / adapters)
* Publish (`buildSc1PublishSlice` + gates `sc1Runtime`)
* Cockpit (bloque SC-1.0)
* Historial
* Cartera

---

## Deudas conocidas

* Incrementar cobertura de tests del árbol stages/evaluators (**>90%** global; orquestadores ya al 100%).
* **Calibración del Score** (pesos, bandas, reglas de producto) — ver [`SC1_SCORE_CALIBRATION.md`](./SC1_SCORE_CALIBRATION.md).
* **Cutover** del motor legacy → SC-1.0 como veredicto operativo.
* Limpieza ESLint del árbol legacy (`npm run lint:all`) fuera del scope SC-1.
* Módulos Settings de Alertas / IA: contratos y UI parcial; **sin** wiring operativo a engines.

---

## Módulos futuros

* Alertas (event-driven sobre SC-1 / cartera)
* IA (explicabilidad / recomendaciones sobre DecisionTrace)
* SaaS Multiempresa (tenancy completo)
* Dashboards de riesgo / exposición SC-1
* Automatizaciones (re-score periódico, umbrales)

---

## Feature flag

`SHOW_SC1_COMPARISON` (`src/lib/featureFlags.js`):

* **ON** → dual-run + gate Publish SC-1 + UI Cockpit
* **OFF** → comportamiento legacy puro (sin dual-run)

---

## Referencias internas

* `src/lib/creditScore/ARCHITECTURE.md`
* `src/lib/creditLimit/ARCHITECTURE.md`
* `src/lib/settings/ARCHITECTURE.md`
* `src/lib/creditPolicy/sc1/DESIGN.md`
* `RELEASE_NOTES_SC1.md` (raíz frontend)
* `docs/MANUAL_ANALISTA_SC1.md` — manual funcional Analistas  
* `docs/MANUAL_AJUSTES_SC1.md` — parámetros de Ajustes  
* `docs/MANUAL_ANALISTA_SC1.pdf` — versión imprimible  
* `docs/SC1_USER_GUIDE.md` — guía de usuario (exportable a PDF)
* `docs/SC1_CALIBRATION_WORKBOOK.xlsx` — workbook de calibración

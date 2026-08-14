# ADR — Modelo definitivo del Score SC-1.0 (7 vs 10 dimensiones)

| Campo | Valor |
|-------|--------|
| **ID** | ADR-SC1-SCORE-DIMENSION-MODEL |
| **Estado** | Aprobado (recomendación técnica) |
| **Fecha** | 2026-07-29 |
| **Alcance** | Score Propio SC-1.0 (`credito/frontend`) |
| **No hace** | Cambios de código, calibración, Cutover |

---

## Contexto

Existen dos representaciones concurrentes del modelo de score:

| Capa | Cantidad | Evidencia |
|------|----------|-----------|
| Runtime (`runOwnCreditScore` → `evaluateProductDimensions`) | **7** | Registry `EVALUATORS` + filtro por `wanted.has(d.id)` |
| Comentario de producto en código | **7** | *“set inicial de dimensiones de producto (solo las 7)”* (`evaluators/index.ts`) |
| `creditScore/ARCHITECTURE.md` | **7** | Tabla de evaluators (liquidity…coverage) |
| `CreditPolicyDocument` default | **10** | `DEFAULT_DIMENSIONS`; pesos `15+12+12+5+12+10+10+8+8+8=100` |
| `creditPolicyRegistry` catalog | **10** | Todas `builtIn: true` (incl. seniority, activity, commercial_behavior) |
| Score Settings seed + Projection | **10** | `dimensionWeights` enabled; proyección conserva las 10 |
| Adapter `buildSc1Metrics` | Claves para las 10 | `activity.riskLevel` **siempre `null`**; seniority/behavior mapeables |
| Tests | Ambiguo | Título “todas las dimensiones de la policy”; assert solo `0 < n ≤ policy.length` |
| Release notes / Platform release | No fijan 7 ni 10 | — |

Las tres dimensiones fuera del registry (**seniority**, **activity**, **commercial_behavior**) tienen peso en política, `rules: []`, y **no** producen `DimensionEvaluation` en el path productivo; por tanto no entran a Aggregator, confidence ni score final.

---

## 1. Decisión — ¿Modelo oficial del producto?

**Modelo oficial del producto SC-1.0: 7 dimensiones.**

Dimensiones oficiales (runtime + arquitectura Score):

1. `liquidity`  
2. `debt`  
3. `profitability`  
4. `documentation`  
5. `bcra`  
6. `checks`  
7. `coverage`  

Las otras tres permanecen en catálogo/política; su estatus formal se define abajo.

### Estado de las dimensiones no activas

Las dimensiones `seniority`, `activity` y `commercial_behavior`:

* **No** están deprecadas.
* **No** están eliminadas.
* Se consideran **reservadas** para una futura versión del modelo.
* **No** deberán utilizarse como criterio de **calibración**, **comparación** o **Cutover** hasta que exista un **ADR posterior** que autorice su incorporación al pipeline de evaluación del Score.

Mientras tanto forman parte del catálogo / `CreditPolicyDocument` / Settings como placeholders de modelo futuro, no del veredicto oficial SC-1.0.

---

## 2. Justificación (solo evidencia de repositorio)

1. **La única orquestación productiva del Score** es `runOwnCreditScore` → `evaluateProductDimensions`. Ese método **filtra** a los IDs del registry de 7 evaluators. No existe otro entrypoint productivo que evalúe las 10.

2. El código **nombra** ese conjunto como decisión de producto: *“set inicial de dimensiones de producto (solo las 7)”*.

3. `ARCHITECTURE.md` del Score documenta **exactamente** esas 7 filas como Dimension Evaluators del pipeline.

4. Las tres excluídas **no están implementadas como dimensiones de score completo**:
   - `rules: []` y sin `defaultPoints`/`defaultScore` en default policy;
   - `activity.riskLevel` hardcodeado a `null` en `buildSc1Metrics`;
   - sin evaluator dedicado en el registry.

5. La política de 10 dimensiones con suma 100 y Settings `enabled: true` **describen configuración ofertable / freeze**, pero **no** el comportamiento que el Aggregator recibe hoy. Declarar 10 como “oficial de producto” contradiría el comportamiento observable de Publish/Cockpit (`OwnCreditScoreResult` built solo desde las 7 evals).

6. Tests y release **no** contractualizan n=10; la arquitectura Score y el comentario del registry **sí** contractualizan el set de 7 a nivel de evaluación.

Conclusión: el **producto que scoréa** es el de 7; el de 10 es el **superconjunto de catálogo/policy incompleto**, no el modelo de evaluación vigente.

---

## 3. Consecuencias de cada alternativa

### A) Mantener 7 dimensiones (oficial)

| Área | Consecuencia |
|------|----------------|
| Producto | El veredicto SC-1 coincide con lo que el engine ejecuta. |
| Política / Settings | Hoy: pesos de las 3 dims “fantasma” no afectan score/confidence (inconsistencia residual de configuración, no de runtime). |
| Calibración | Se calibra el universo real (≤7), más historiales dual-run interpretables. |
| Cutover | El score operativo es el ya medible; hay que **no vender** las 3 dims como parte del veredicto hasta activarlas. |
| Mantenimiento | Superficie estable; no obliga adapters/reglas nuevas. Deuda: alinear docs/policy weights con el set oficial para evitar confusión. |
| Costo | Bajo en código; costo de gobernanza (clarificar qué es catálogo vs set activo). |

### B) Evolucionar a 10 dimensiones (oficial)

| Área | Consecuencia |
|------|----------------|
| Producto | Política y runtime alineados en número. |
| Requisitos previos evidenciados | Ampliar registry / dejar de filtrar a 7; reglas (o defaults) para seniority/behavior/activity; métrica real de activity (hoy `null`); posible evaluator o path genérico por dim. |
| Calibración | Solo válida **después** de cerrar reglas + adapter + pipeline; calibrar ahora “como si fueran 10” falsea distribución. |
| Cutover | Más tarde: mayor paridad con Settings de 10, pero introduce riesgo de cambio de distribución de scores antes del cutover. |
| Mantenimiento | Más código paths, más mocks/tests, más sensibilidad a datos faltantes (3 dims nuevas en confidence). |
| Costo | Alto; toca orquestación Score (fuera de “solo parámetros”) respecto al freeze de plataforma. |

---

## 4. Qué alternativa minimiza riesgo

| Objetivo | Alternativa de menor riesgo | Motivo ligado a evidencia |
|----------|----------------------------|---------------------------|
| **Calibración** | **A (7)** | Solo las 7 pueden recibir score hoy; pesos de las otras no entran al Aggregator. |
| **Cutover** | **A (7)** | Cutover sobre el score **realmente publicado**; evolucionar a 10 antes mueve la distribución sin baseline estable de 7. |
| **Mantenimiento** | **A (7)** | Evita implementar activity (null) + rules vacías + cambio de `evaluateProductDimensions` bajo la plataforma “cerrada”. |

**B** minimiza el riesgo de *inconsistencia política↔runtime a largo plazo*, pero **aumenta** riesgo inmediato de calibración/Cutover/mantenimiento.

---

## Recomendación técnica final

1. **Modelo oficial SC-1.0 Score = 7 dimensiones** (las del registry / `ARCHITECTURE.md` / `evaluateProductDimensions`).  
2. `seniority`, `activity` y `commercial_behavior` quedan **reservadas** (no deprecadas ni eliminadas): fuera de calibración, comparación y Cutover hasta un **ADR posterior** que las incorpore al pipeline.  
3. Cualquier calibración o gate de Cutover debe basarse en el universo de **7**, no en la suma de pesos de las 10.  
4. La discrepancia política/Settings (10 enabled, suma 100) es **deuda de alineación de configuración**, no argumento para redefinir el modelo oficial como 10 sin cerrar runtime.

**Estado de decisión:** Adoptar **alternativa A** como modelo oficial de producto; dimensiones no activas = **reservadas**.

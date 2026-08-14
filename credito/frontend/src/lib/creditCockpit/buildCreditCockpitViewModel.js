/**
 * View-model presentacional del cockpit crediticio.
 * No calcula score/límites: solo mapea datos ya resueltos por el análisis.
 */

import { SHOW_CAPACIDAD_FINANCIERA } from "@/config/creditAnalysis"
import { formatCreditAmount, formatRatioPercent } from "@/lib/creditAnalysisEngine"
import { RESULTADO_COBERTURA } from "@/lib/coverageRequirements"

const DASH = "—"

/**
 * @param {unknown} value
 * @returns {string}
 */
function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return ""
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function displayText(value) {
  if (value == null || value === "") return DASH
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  const text = String(value).trim()
  return text || DASH
}

/**
 * @param {number | null | undefined} amount
 * @returns {string}
 */
function displayAmount(amount) {
  if (amount == null || !Number.isFinite(amount)) return DASH
  return formatCreditAmount(amount)
}

/**
 * Formato compacto solo para KPI (presentación). Detalle conserva el monto completo.
 * @param {number | null | undefined} amount
 * @returns {string}
 */
function displayAmountKpi(amount) {
  if (amount == null || !Number.isFinite(amount)) return DASH
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    const millions = amount / 1_000_000
    return `$${millions.toLocaleString("es-AR", {
      maximumFractionDigits: millions >= 100 ? 0 : 2,
      minimumFractionDigits: 0,
    })} M`
  }
  if (abs >= 10_000) {
    const thousands = amount / 1_000
    return `$${thousands.toLocaleString("es-AR", {
      maximumFractionDigits: thousands >= 100 ? 0 : 1,
      minimumFractionDigits: 0,
    })} K`
  }
  return formatCreditAmount(amount)
}

/**
 * @param {number | null | undefined} ratio
 * @returns {string}
 */
function displayRatio(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return DASH
  return formatRatioPercent(ratio)
}

/**
 * @param {unknown} dateLike
 * @returns {string}
 */
function formatDateLike(dateLike) {
  if (dateLike == null || dateLike === "") return DASH
  if (typeof dateLike === "string" && /^\d{4}-\d{2}/.test(dateLike)) {
    return dateLike.slice(0, 10)
  }
  if (typeof dateLike === "object" && dateLike && typeof dateLike.toDate === "function") {
    try {
      return dateLike.toDate().toLocaleDateString("es-AR")
    } catch {
      return DASH
    }
  }
  const asDate = new Date(/** @type {string | number | Date} */ (dateLike))
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toLocaleDateString("es-AR")
  }
  return displayText(dateLike)
}

/**
 * @param {number | null | undefined} years
 * @returns {string}
 */
function formatAntiguedad(years) {
  if (years == null || !Number.isFinite(years)) return DASH
  const rounded = Math.round(years * 10) / 10
  return `${rounded} año${rounded === 1 ? "" : "s"}`
}

/**
 * @param {string} tone
 * @param {string} status
 * @returns {"completo" | "pendiente" | "vencido" | "info"}
 */
function mapDocEstado(tone, status) {
  const statusLower = String(status ?? "").toLowerCase()
  if (tone === "danger" || statusLower.includes("vencid")) return "vencido"
  if (
    statusLower.includes("pendiente") ||
    tone === "warning" ||
    statusLower === "opcional"
  ) {
    return "pendiente"
  }
  if (tone === "success" || statusLower.includes("confirmado")) return "completo"
  if (status && status !== "Pendiente") return "completo"
  return "pendiente"
}

const DOC_ESTADO_LABEL = {
  completo: "Completo",
  pendiente: "Pendiente",
  vencido: "Vencido",
  info: "Información",
}

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   razonSocialBcra?: string | null;
 *   bcra?: {
 *     peorSituacion?: number | null;
 *     deudaTotal?: number | null;
 *     hasBcra?: boolean;
 *     riskLabel?: string | null;
 *     periodo?: string | null;
 *     entidadesCount?: number | null;
 *     entidadesConAtraso?: number | null;
 *   } | null;
 *   computed?: Record<string, any> | null;
 *   coverageDecision?: Record<string, any> | null;
 *   preCalLoading?: boolean;
 *   estadoDocumentalItems?: Array<Record<string, any>>;
 *   fechaInicioActividad?: string | Date | null;
 *   montoCreditoOtorgado?: number | null;
 * }} input
 */
export function buildCreditCockpitViewModel(input) {
  const empresa = input.empresa ?? null
  const computed = input.computed ?? null
  const coverage = input.coverageDecision ?? null
  const bcra = input.bcra ?? null
  const nosis = computed?.nosisAnalisis ?? null
  const capacidad = computed?.capacidadEconomica ?? null
  const credito = computed?.creditoAsumible ?? null
  const preCal = computed?.preCalificacion ?? null
  const resumen = computed?.resumenEjecutivo ?? null
  const comportamiento = computed?.comportamientoComercial ?? null
  const warnings = Array.isArray(computed?.warnings) ? computed.warnings : []

  const razonSocial =
    pickString(
      resumen?.razonSocial,
      input.razonSocialBcra,
      empresa?.razonSocial,
      empresa?.nombre,
      empresa?.nombreComercial,
      empresa?.denominacion,
      empresa?.cliente,
      nosis?.razonSocial
    ) || DASH

  const scoreFinanciero =
    resumen?.scoreFinanciero != null && Number.isFinite(resumen.scoreFinanciero)
      ? resumen.scoreFinanciero
      : null
  const scoreNosis =
    nosis?.scoreNosis != null && Number.isFinite(nosis.scoreNosis)
      ? nosis.scoreNosis
      : null
  const scorePonderado =
    resumen?.scoreGeneralPonderado != null &&
    Number.isFinite(resumen.scoreGeneralPonderado)
      ? resumen.scoreGeneralPonderado
      : null

  const scorePrimary = scorePonderado ?? scoreFinanciero ?? scoreNosis
  const scoreTone =
    resumen?.estadoGeneral === "good"
      ? "good"
      : resumen?.estadoGeneral === "medium"
        ? "warn"
        : resumen?.estadoGeneral === "risky"
          ? "critical"
          : "neutral"

  const situacionBcra =
    bcra?.peorSituacion != null && Number.isFinite(bcra.peorSituacion)
      ? bcra.peorSituacion
      : nosis?.situacionBcra != null
        ? Number(nosis.situacionBcra)
        : null

  const facturacionAnual = capacidad?.ventasAnualesEstimadas ?? null
  const facturacionMensual = capacidad?.ventasPromedioMensuales ?? null
  const preCalMonto =
    preCal?.preCalificacion != null && Number.isFinite(preCal.preCalificacion)
      ? preCal.preCalificacion
      : null
  const creditoSugerido =
    credito?.creditoSugerido != null && Number.isFinite(credito.creditoSugerido)
      ? credito.creditoSugerido
      : null

  const limiteSugerido = preCalMonto ?? creditoSugerido
  const endeudamientoBcra = bcra?.deudaTotal ?? null
  const endeudamientoRatio = capacidad?.endeudamiento ?? null

  const resultadoCobertura = coverage?.resultadoCobertura ?? null
  const criterioLabel = coverage?.resultadoCoberturaLabel
    ? String(coverage.resultadoCoberturaLabel)
    : DASH
  /** Etiqueta corta solo para el KPI (presentación). */
  const criterioKpiValue =
    criterioLabel === DASH
      ? DASH
      : criterioLabel.length > 18
        ? `${criterioLabel.slice(0, 16)}…`
        : criterioLabel
  const criterioTone =
    resultadoCobertura === RESULTADO_COBERTURA.SIN_COBERTURA
      ? "critical"
      : resultadoCobertura
        ? "good"
        : "neutral"

  const tipoSocietario = pickString(
    empresa?.tipoSocietario,
    empresa?.tipoSociedad,
    empresa?.formaJuridica,
    empresa?.tipoEmpresa,
    preCal?.tipoEmpresaLabel
  )
  const actividad = pickString(
    empresa?.actividad,
    empresa?.actividadPrincipal,
    empresa?.rubro,
    nosis?.rubro,
    nosis?.actividad
  )
  const fechaConstitucion = pickString(
    empresa?.fechaConstitucion,
    empresa?.fechaInicioActividad,
    empresa?.inicioActividad
  )
  const situacionImpositiva = pickString(
    empresa?.situacionImpositiva,
    empresa?.condicionIva,
    empresa?.condicionIVA,
    empresa?.tipoContribuyente
  )

  const ultimoBalance =
    pickString(
      preCal?.periodoBalance,
      preCal?.fechaCierreBalance,
      capacidad?.periodoBalance
    ) || DASH

  const docItems = Array.isArray(input.estadoDocumentalItems)
    ? input.estadoDocumentalItems
    : []
  const docFocusLabels = new Set(["Balances", "IVA", "IIBB"])
  const documentation = docItems
    .filter((item) => docFocusLabels.has(String(item.label)))
    .map((item) => {
      const estado = mapDocEstado(item.tone, item.status)
      return {
        label: item.label === "Balances" ? "Balance" : item.label,
        fecha: item.status && item.status !== "Pendiente" ? String(item.status) : DASH,
        estado,
        estadoLabel: DOC_ESTADO_LABEL[estado],
        subtitle: item.subtitle ? String(item.subtitle) : null,
        tone: item.tone ?? "muted",
        vigencyEmoji: item.vigencyEmoji ?? null,
      }
    })

  const docsIncomplete = documentation.some(
    (row) => row.estado === "pendiente" || row.estado === "vencido"
  )

  /** @type {Array<{ id: string; level: "normal" | "warning" | "critical" | "info"; title: string; detail?: string }>} */
  const alerts = []

  if (bcra?.hasBcra && situacionBcra != null && situacionBcra <= 1 && !(bcra.entidadesConAtraso > 0)) {
    alerts.push({
      id: "bcra-normal",
      level: "normal",
      title: "Situación BCRA normal",
      detail: `Situación ${situacionBcra}`,
    })
  }
  if (situacionBcra != null && situacionBcra >= 3) {
    alerts.push({
      id: "bcra-risk",
      level: situacionBcra >= 4 ? "critical" : "warning",
      title: "Situación BCRA observada",
      detail: `Situación ${situacionBcra}${bcra?.riskLabel ? ` — ${bcra.riskLabel}` : ""}`,
    })
  }
  if (scoreTone === "critical" || (scoreFinanciero != null && scoreFinanciero < 40)) {
    alerts.push({
      id: "score-low",
      level: "critical",
      title: "Score debajo del umbral",
      detail:
        scorePrimary != null ? `Score ${scorePrimary}` : "Score financiero bajo",
    })
  } else if (scoreTone === "warn") {
    alerts.push({
      id: "score-mid",
      level: "warning",
      title: "Score con observaciones",
      detail: scorePrimary != null ? `Score ${scorePrimary}` : undefined,
    })
  }
  if (resultadoCobertura === RESULTADO_COBERTURA.SIN_COBERTURA) {
    alerts.push({
      id: "limit-denied",
      level: "critical",
      title: "Sin cobertura / límite no habilitado",
      detail: criterioLabel,
    })
  }
  if (docsIncomplete) {
    alerts.push({
      id: "docs-incomplete",
      level: "warning",
      title: "Documentación incompleta o vencida",
    })
  }
  if (nosis && nosis.confirmado === false && nosis.disponible) {
    alerts.push({
      id: "nosis-pending",
      level: "info",
      title: "NOSIS pendiente de confirmación",
    })
  }
  for (const warning of warnings.slice(0, 8)) {
    const text = String(warning)
    alerts.push({
      id: `warn-${alerts.length}`,
      level: /cheque|riesgo|sin cobertura|risky/i.test(text)
        ? "critical"
        : /pendiente|sin |falta/i.test(text)
          ? "warning"
          : "info",
      title: text,
    })
  }

  const revisionManual =
    resultadoCobertura === RESULTADO_COBERTURA.SIN_COBERTURA ||
    scoreTone === "critical" ||
    docsIncomplete ||
    warnings.length > 0

  const profileCards = [
    {
      id: "score",
      label: "Score crediticio",
      value:
        scorePrimary != null
          ? String(Math.round(scorePrimary))
          : input.preCalLoading
            ? "…"
            : DASH,
      hint:
        scoreFinanciero != null && scoreNosis != null
          ? `Financiero ${scoreFinanciero} · NOSIS ${scoreNosis}`
          : scoreFinanciero != null
            ? "Score financiero"
            : scoreNosis != null
              ? "Score NOSIS"
              : null,
      tone: scoreTone,
      icon: "score",
      tooltip:
        "Score consolidado a partir del análisis financiero y, si existe, NOSIS. No modifica motores de cálculo.",
      detailTitle: "Detalle de score",
      detailRows: [
        { label: "Score financiero", value: displayText(scoreFinanciero) },
        { label: "Score NOSIS", value: displayText(scoreNosis) },
        {
          label: "Score ponderado",
          value: displayText(scorePonderado),
        },
        {
          label: "Estado general",
          value: displayText(resumen?.estadoGeneral),
        },
      ],
    },
    {
      id: "bcra",
      label: "Situación BCRA",
      value:
        situacionBcra != null
          ? String(situacionBcra)
          : DASH,
      hint: bcra?.riskLabel || null,
      tone:
        situacionBcra == null
          ? "neutral"
          : situacionBcra <= 1
            ? "good"
            : situacionBcra === 2
              ? "warn"
              : "critical",
      icon: "bcra",
      tooltip:
        "Peor situación informada ante el BCRA (1 = normal). Detalle de deuda y entidades en el panel.",
      detailTitle: "Detalle BCRA",
      detailRows: [
        { label: "Situación", value: displayText(situacionBcra) },
        { label: "Clasificación", value: displayText(bcra?.riskLabel) },
        { label: "Período", value: displayText(bcra?.periodo) },
        {
          label: "Deuda total",
          value:
            endeudamientoBcra != null
              ? `$${Number(endeudamientoBcra).toLocaleString("es-AR")}`
              : DASH,
        },
        {
          label: "Entidades",
          value: displayText(bcra?.entidadesCount),
        },
        {
          label: "Con atraso",
          value: displayText(bcra?.entidadesConAtraso),
        },
      ],
    },
    {
      id: "facturacion",
      label: "Facturación estimada",
      value: displayAmountKpi(facturacionAnual ?? facturacionMensual),
      hint: facturacionAnual != null ? "Anual estimada" : facturacionMensual != null ? "Promedio mensual" : null,
      tone: "info",
      icon: "facturacion",
      tooltip:
        "Estimación a partir de ventas del análisis (balance / IVA / IIBB) ya calculadas.",
      detailTitle: "Detalle de facturación",
      detailRows: [
        {
          label: "Ventas anuales estimadas",
          value: displayAmount(facturacionAnual),
        },
        {
          label: "Promedio mensual",
          value: displayAmount(facturacionMensual),
        },
        {
          label: "Pre-calificación (base)",
          value: displayAmount(preCalMonto),
        },
      ],
    },
    {
      id: "endeudamiento",
      label: "Endeudamiento",
      value:
        endeudamientoBcra != null
          ? displayAmountKpi(endeudamientoBcra)
          : displayRatio(endeudamientoRatio),
      hint:
        endeudamientoBcra != null
          ? "Deuda sistema financiero (BCRA)"
          : endeudamientoRatio != null
            ? "Ratio pasivo/activo"
            : null,
      tone:
        capacidad?.semaforos?.endeudamiento === "risky"
          ? "critical"
          : capacidad?.semaforos?.endeudamiento === "medium"
            ? "warn"
            : endeudamientoBcra != null
              ? "debt"
              : capacidad?.semaforos?.endeudamiento === "good"
                ? "good"
                : "neutral",
      icon: "endeudamiento",
      tooltip:
        "Deuda BCRA cuando existe consulta; si no, ratio de endeudamiento del balance.",
      detailTitle: "Detalle de endeudamiento",
      detailRows: [
        {
          label: "Deuda BCRA",
          value:
            endeudamientoBcra != null
              ? `$${Number(endeudamientoBcra).toLocaleString("es-AR")}`
              : DASH,
        },
        {
          label: "Ratio endeudamiento",
          value: displayRatio(endeudamientoRatio),
        },
        {
          label: "Semáforo",
          value: displayText(capacidad?.semaforos?.endeudamiento),
        },
        {
          label: "Patrimonio neto",
          value: displayAmount(capacidad?.patrimonioNeto),
        },
      ],
    },
    {
      id: "limite",
      label: "Límite sugerido",
      value: input.preCalLoading ? "…" : displayAmountKpi(limiteSugerido),
      hint: preCal?.tipoEmpresaLabel && preCal.tipoEmpresaLabel !== "—"
        ? String(preCal.tipoEmpresaLabel)
        : null,
      tone: limiteSugerido != null ? "info" : "neutral",
      icon: "limite",
      tooltip:
        "Límite de precalificación / capacidad ya calculado por el motor existente (solo visualización).",
      detailTitle: "Detalle de límite",
      detailRows: [
        {
          label: "Pre calificación",
          value: displayAmount(preCalMonto),
        },
        ...(SHOW_CAPACIDAD_FINANCIERA
          ? [
              {
                label: "Crédito sugerido (capacidad)",
                value: displayAmount(creditoSugerido),
              },
              {
                label: "Por ventas",
                value: displayAmount(credito?.creditoPorVentas),
              },
              {
                label: "Por patrimonio",
                value: displayAmount(credito?.creditoPorPatrimonio),
              },
              {
                label: "Por flujo IVA",
                value: displayAmount(credito?.creditoPorFlujo),
              },
            ]
          : []),
        {
          label: "Crédito otorgado (analista)",
          value: displayAmount(input.montoCreditoOtorgado),
        },
      ],
    },
    {
      id: "criterio",
      label: "Criterio de aceptación",
      value: criterioKpiValue,
      hint: coverage?.tipoOperacion
        ? `Operación ${coverage.tipoOperacion}`
        : null,
      tone: criterioTone,
      icon: "criterio",
      tooltip:
        "Resultado de cobertura / aceptación según reglas ya evaluadas (nominado, discrecional o sin cobertura).",
      detailTitle: "Detalle de criterio",
      detailRows: [
        { label: "Resultado", value: criterioLabel },
        {
          label: "Tipo operación",
          value: displayText(coverage?.tipoOperacion),
        },
        {
          label: "Motivos exclusión",
          value:
            Array.isArray(coverage?.motivosExclusion) &&
            coverage.motivosExclusion.length > 0
              ? coverage.motivosExclusion.join("; ")
              : DASH,
        },
      ],
    },
  ]

  const generalInfo = [
    { label: "Razón social", value: razonSocial },
    { label: "CUIT", value: displayText(input.cuit) },
    { label: "Tipo societario", value: displayText(tipoSocietario) },
    { label: "Actividad", value: displayText(actividad) },
    {
      label: "Fecha de constitución",
      value: fechaConstitucion ? formatDateLike(fechaConstitucion) : DASH,
    },
    {
      label: "Antigüedad",
      value: formatAntiguedad(coverage?.antiguedadAnios),
    },
    { label: "Último balance disponible", value: ultimoBalance },
    {
      label: "Facturación",
      value: displayAmount(facturacionAnual ?? facturacionMensual),
    },
    { label: "Situación impositiva", value: displayText(situacionImpositiva) },
  ]

  const analysisRows = [
    {
      label: "Score",
      value: scorePrimary != null ? String(Math.round(scorePrimary)) : DASH,
    },
    { label: "Límite sugerido", value: displayAmount(limiteSugerido) },
    {
      label: "Techo comercial global",
      value: DASH,
      note: "No configurado en el sistema",
    },
    {
      label: "Cobertura de seguro",
      value: criterioLabel,
    },
    {
      label: "Riesgo asumido por Grupo Núcleo",
      value: DASH,
      note: "No disponible",
    },
    {
      label: "Endeudamiento",
      value:
        endeudamientoBcra != null
          ? `$${Number(endeudamientoBcra).toLocaleString("es-AR")}`
          : displayRatio(endeudamientoRatio),
    },
    {
      label: "Comportamiento de pago",
      value:
        comportamiento?.cantidadRechazados != null
          ? `${comportamiento.cantidadRechazados} rechazo(s)`
          : displayText(nosis?.estadoComercial),
    },
    {
      label: "Documentación disponible",
      value: docsIncomplete ? "Pendiente / incompleta" : documentation.length ? "Completa" : DASH,
    },
    {
      label: "Alertas",
      value: String(
        alerts.filter((a) => a.level === "critical" || a.level === "warning")
          .length
      ),
    },
    {
      label: "Revisión manual requerida",
      value: revisionManual ? "Sí" : "No",
    },
  ]

  return {
    razonSocial,
    cuit: input.cuit,
    updatedAt: resumen?.fechaAnalisis ?? null,
    profileCards,
    generalInfo,
    analysisRows,
    documentation,
    documentationAll: docItems,
    alerts,
    revisionManual,
    emptyComputed: !computed,
  }
}

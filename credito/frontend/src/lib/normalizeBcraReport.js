import {
  detectBcraMontoFormat,
  convertBcraMontoToPesos,
  logBcraMonto,
} from "@/lib/bcraMonto";

/**
 * Normaliza reportes BCRA desde Firestore, sessionStorage o API. *
 * Formato A (API anidada):
 *   { results: { denominacion, periodos: [{ periodo, entidades }] } }
 *   o { denominacion, periodos: [...] }
 *
 * Formato B (mapper / plano):
 *   { denominacion, entidades[], resumen? }
 *
 * Formato C (legacy / scoring):
 *   { denominacion?, resumen?, situacion_general }
 */

const EMPTY = {
  denominacion: null,
  periodo: null,
  entidades: [],
  situacionGeneral: null,
  montoFormato: null,
};

/**
 * @param {unknown} raw
 * @returns {{
 *   denominacion: string | null;
 *   periodo: string | null;
 *   entidades: Array<Record<string, unknown>>;
 *   situacionGeneral: number | null;
 *   montoFormato: 'MILES' | 'PESOS' | null;
 * }}
 */
export function normalizeBcraReport(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY };
  }

  const doc = /** @type {Record<string, unknown>} */ (raw);
  const results =
    doc.results && typeof doc.results === "object" && !Array.isArray(doc.results)
      ? /** @type {Record<string, unknown>} */ (doc.results)
      : null;

  const periodos = /** @type {unknown[]} */ (
    results?.periodos ?? doc.periodos ?? []
  );

  const flatEntidades = /** @type {unknown[]} */ (doc.entidades ?? []);
  const explicitFormat = pickString(
    doc.montoFormato,
    results?.montoFormato
  );

  if (Array.isArray(periodos) && periodos.length > 0) {
    const bestPeriod = pickBestPeriodo(periodos);
    const rawEntidades = /** @type {unknown[]} */ (bestPeriod.entidades ?? []);
    const montoFormato = detectBcraMontoFormat({
      periodos,
      explicitFormat: explicitFormat ?? "MILES",
    });

    const entidades = rawEntidades.map((e) =>
      normalizeEntidad(e, montoFormato, "api.periodos")
    );

    logBcraMonto("normalize.periodos", {
      montoFormato,
      entidades: entidades.length,
    });

    return {
      denominacion: pickString(results?.denominacion, doc.denominacion),
      periodo: pickString(bestPeriod.periodo),
      entidades,
      situacionGeneral: maxSituacionFromEntidades(rawEntidades),
      montoFormato,
    };
  }

  if (Array.isArray(flatEntidades) && flatEntidades.length > 0) {
    const montoFormato = detectBcraMontoFormat({
      flatEntidades,
      hasMapperResumen: Boolean(doc.resumen),
      explicitFormat,
    });

    const entidades = flatEntidades.map((e) =>
      normalizeEntidad(e, montoFormato, "mapper.flat")
    );

    logBcraMonto("normalize.flat", {
      montoFormato,
      entidades: entidades.length,
      hasMapperResumen: Boolean(doc.resumen),
    });

    return {
      denominacion: pickString(doc.denominacion, results?.denominacion),
      periodo: pickString(doc.periodo),
      entidades,
      situacionGeneral: maxSituacionFromEntidades(flatEntidades),
      montoFormato,
    };
  }

  const situacionGeneral =
    doc.situacion_general != null
      ? Number(doc.situacion_general) || null
      : results?.situacion_general != null
        ? Number(results.situacion_general) || null
        : null;

  const denominacion = pickString(doc.denominacion, results?.denominacion);

  if (denominacion || situacionGeneral != null || doc.resumen) {
    return {
      denominacion,
      periodo: pickString(doc.periodo),
      entidades: [],
      situacionGeneral,
    };
  }

  return { ...EMPTY };
}

/**
 * Elige el documento BCRA más reciente y con más datos útiles.
 *
 * @param {Array<Record<string, unknown>> | undefined} reports
 * @returns {Record<string, unknown> | null}
 */
export function pickLatestBcraDocument(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return null;
  }

  const sorted = [...reports].sort((a, b) => {
    const tb = getReportTimestamp(b);
    const ta = getReportTimestamp(a);
    if (tb !== ta) {
      return tb - ta;
    }
    return scoreReportRichness(b) - scoreReportRichness(a);
  });

  return sorted[0] ?? null;
}

/**
 * Prefiere Firestore; si session tiene más entidades, usa session.
 *
 * @param {Record<string, unknown> | null} firestoreDoc
 * @param {Record<string, unknown> | null} sessionDoc
 * @returns {Record<string, unknown> | null}
 */
export function pickBestBcraSource(firestoreDoc, sessionDoc) {
  if (!firestoreDoc && !sessionDoc) {
    return null;
  }
  if (!firestoreDoc) {
    return sessionDoc;
  }
  if (!sessionDoc) {
    return firestoreDoc;
  }

  const firestoreScore = scoreReportRichness(firestoreDoc);
  const sessionScore = scoreReportRichness(sessionDoc);

  if (sessionScore > firestoreScore) {
    return sessionDoc;
  }

  const tf = getReportTimestamp(firestoreDoc);
  const ts = getReportTimestamp(sessionDoc);
  if (ts > tf && sessionScore >= firestoreScore) {
    return sessionDoc;
  }

  return firestoreDoc;
}

/**
 * @param {unknown[]} periodos
 * @returns {Record<string, unknown>}
 */
function pickBestPeriodo(periodos) {
  const valid = periodos.filter(
    (p) => p && typeof p === "object" && !Array.isArray(p)
  );
  if (valid.length === 0) {
    return {};
  }

  const sorted = [...valid].sort((a, b) => {
    const pb = /** @type {Record<string, unknown>} */ (b);
    const pa = /** @type {Record<string, unknown>} */ (a);
    const entB = Array.isArray(pb.entidades) ? pb.entidades.length : 0;
    const entA = Array.isArray(pa.entidades) ? pa.entidades.length : 0;
    if (entB !== entA) {
      return entB - entA;
    }
    return String(pb.periodo ?? "").localeCompare(String(pa.periodo ?? ""));
  });

  return /** @type {Record<string, unknown>} */ (sorted[0]);
}

/**
 * @param {Record<string, unknown>} report
 * @returns {number}
 */
function getReportTimestamp(report) {
  const raw = report.fetchedAt ?? report.createdAt ?? report.timestamp ?? 0;
  if (typeof raw === "number") {
    return raw;
  }
  if (raw && typeof raw === "object" && "toMillis" in raw) {
    return Number(/** @type {{ toMillis: () => number }} */ (raw).toMillis()) || 0;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * @param {Record<string, unknown>} report
 * @returns {number}
 */
function scoreReportRichness(report) {
  const normalized = normalizeBcraReport(report);
  let score = normalized.entidades.length * 10;
  if (normalized.denominacion) {
    score += 2;
  }
  if (normalized.situacionGeneral != null) {
    score += 1;
  }
  if (report.resumen) {
    score += 1;
  }
  return score;
}

/**
 * @param {unknown[]} entidades
 * @returns {number | null}
 */
function maxSituacionFromEntidades(entidades) {
  if (!Array.isArray(entidades) || entidades.length === 0) {
    return null;
  }
  return entidades.reduce((max, e) => {
    const s =
      e && typeof e === "object"
        ? Number(/** @type {Record<string, unknown>} */ (e).situacion) || 1
        : 1;
    return Math.max(max, s);
  }, 1);
}

/**
 * @param {unknown} e
 * @param {'MILES' | 'PESOS'} montoFormato
 * @param {string} scope
 * @returns {Record<string, unknown>}
 */
function normalizeEntidad(e, montoFormato, scope) {
  const row =
    e && typeof e === "object" && !Array.isArray(e)
      ? /** @type {Record<string, unknown>} */ (e)
      : {};

  const { montoRaw, montoPesos, format } = convertBcraMontoToPesos(
    row.monto,
    montoFormato
  );

  logBcraMonto(scope, {
    entidad: pickString(row.entidad) ?? "Desconocida",
    montoFormat: format,
    montoRaw,
    montoPesos,
  });

  return {
    entidad: pickString(row.entidad) ?? "Desconocida",
    situacion: Number(row.situacion) || 1,
    monto: montoPesos,
    diasAtrasoPago: Number(row.diasAtrasoPago) || 0,
    refinanciaciones: Boolean(row.refinanciaciones),
    procesoJud: Boolean(row.procesoJud),
    situacionJuridica: Boolean(row.situacionJuridica),
  };
}

/**
 * @param {...unknown} values
 * @returns {string | null}
 */
function pickString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

/**
 * Métricas unificadas a partir de un reporte normalizado.
 *
 * @param {ReturnType<typeof normalizeBcraReport>} normalized
 */
export function computeBcraMetrics(normalized) {
  const entidades = normalized.entidades ?? [];

  const peorSituacion = entidades.length
    ? Math.max(...entidades.map((e) => Number(e.situacion) || 1))
    : normalized.situacionGeneral;

  const deudaTotal = entidades.reduce(
    (acc, e) => acc + (Number(e.monto) || 0),
    0
  );

  logBcraMonto("compute.deudaTotal", {
    montoFormato: normalized.montoFormato,
    deudaTotal,
    entidades: entidades.length,
  });

  const entidadesConAtraso = entidades.filter(
    (e) => (Number(e.situacion) || 1) > 1
  ).length;

  const entidadesProblemas = entidades.filter(
    (e) =>
      (Number(e.situacion) || 1) > 1 ||
      (Number(e.diasAtrasoPago) || 0) > 0 ||
      Boolean(e.refinanciaciones) ||
      Boolean(e.procesoJud) ||
      Boolean(e.situacionJuridica)
  );

  const maxDiasAtraso = entidades.length
    ? Math.max(...entidades.map((e) => Number(e.diasAtrasoPago) || 0))
    : 0;

  return {
    entidades,
    peorSituacion,
    deudaTotal,
    entidadesConAtraso,
    entidadesProblemas,
    maxDiasAtraso,
    tieneProblemas: entidadesProblemas.length > 0,
    tieneJudiciales: entidades.some((e) => Boolean(e.procesoJud)),
    tieneRefinanciaciones: entidades.some((e) => Boolean(e.refinanciaciones)),
    hasBcra:
      entidades.length > 0 ||
      normalized.situacionGeneral != null ||
      Boolean(normalized.denominacion),
  };
}

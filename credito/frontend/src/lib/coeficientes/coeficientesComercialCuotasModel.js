import { compareCuotas } from "@/lib/coeficientes/coeficientesVigentesModel";

/** @typedef {{ key: string; label: string }} CuotaComercialPreset */

/** Cuotas visibles por defecto en planilla comercial. */
export const DEFAULT_CUOTAS_COMERCIALES_VISIBLES = [
  "DEBITO",
  "1",
  "2",
  "3",
  "6",
  "9",
  "12",
  "18",
  "24",
];

/** @type {CuotaComercialPreset[]} */
export const CUOTAS_COMERCIALES_PRESETS = [
  { key: "DEBITO", label: "Débito" },
  { key: "1", label: "1 cuota" },
  { key: "2", label: "2 cuotas" },
  { key: "3", label: "3 cuotas" },
  { key: "6", label: "6 cuotas" },
  { key: "9", label: "9 cuotas" },
  { key: "12", label: "12 cuotas" },
  { key: "18", label: "18 cuotas" },
  { key: "24", label: "24 cuotas" },
];

/**
 * Clave canónica para Firestore (DEBITO | "1" | "2" | …).
 * @param {unknown} value
 */
export function normalizeCuotaComercialKey(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "DÉBITO" || upper === "DEBITO" || upper === "DEB") {
    return "DEBITO";
  }
  if (upper === "1 CUOTA" || upper === "1") {
    return "1";
  }
  if (upper === "PLAN Z" || upper === "PLANZ") {
    return "PLAN Z";
  }
  const cuotasLabelMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*cuotas?$/i);
  if (cuotasLabelMatch) {
    const n = Number(cuotasLabelMatch[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) {
      return String(Math.trunc(n));
    }
  }
  const n = Number(raw.replace(",", "."));
  if (Number.isFinite(n) && n > 0) {
    return String(Math.trunc(n));
  }
  return upper;
}

/**
 * @param {string} key
 */
export function cuotaComercialKeyToDisplay(key) {
  if (key === "DEBITO") {
    return "Débito";
  }
  if (key === "PLAN Z") {
    return "Plan Z";
  }
  const n = Number(key);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return key;
}

/**
 * Plan Z y variantes siempre al final de la planilla comercial.
 * @param {string} key
 */
export function isPlanZCuotaKey(key) {
  const normalized = normalizeCuotaComercialKey(key);
  return normalized === "PLAN Z";
}

/**
 * Orden canónico: Débito → cuotas numéricas ascendentes → Plan Z → otros textos.
 * @param {string[]} keys
 */
export function sortCuotasComercialesKeys(keys) {
  const unique = [];
  const seen = new Set();

  for (const item of keys ?? []) {
    const key = normalizeCuotaComercialKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }

  return unique.sort((a, b) => {
    if (a === "DEBITO") return -1;
    if (b === "DEBITO") return 1;

    const aPlanZ = isPlanZCuotaKey(a);
    const bPlanZ = isPlanZCuotaKey(b);
    if (aPlanZ && !bPlanZ) return 1;
    if (!aPlanZ && bPlanZ) return -1;

    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na) && na > 0;
    const bNum = Number.isFinite(nb) && nb > 0;
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;

    return String(a).localeCompare(String(b), "es");
  });
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseCuotasComercialesVisibles(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_CUOTAS_COMERCIALES_VISIBLES];
  }

  /** @type {string[]} */
  const result = [];
  const seen = new Set();

  for (const item of raw) {
    const key = normalizeCuotaComercialKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result.length > 0
    ? sortCuotasComercialesKeys(result)
    : [...DEFAULT_CUOTAS_COMERCIALES_VISIBLES];
}

/** Cuotas cuyo valor proviene de parámetros globales, no de importaciones. */
export const CUOTAS_COMERCIALES_SINTETICAS = ["DEBITO", "1"];

/**
 * Cuotas de datos (excluye Débito y 1 cuota).
 * @param {string[]} visibleKeys
 */
export function filterDataCuotasKeys(visibleKeys) {
  const sinteticas = new Set(CUOTAS_COMERCIALES_SINTETICAS);
  return (visibleKeys ?? []).filter((key) => !sinteticas.has(key));
}

/**
 * @param {string} key
 */
export function isCuotaComercialSintetica(key) {
  return CUOTAS_COMERCIALES_SINTETICAS.includes(normalizeCuotaComercialKey(key));
}

/**
 * @param {string | number} cuotas
 * @param {string[]} visibleKeys
 */
export function isCuotaComercialVisible(cuotas, visibleKeys) {
  const key = normalizeCuotaComercialKey(cuotas);
  return visibleKeys.includes(key);
}

/**
 * Claves de cuotas presentes en datos vigentes (importaciones activas).
 * @param {Array<{ cuotas: string | number }>} rows
 */
export function collectCuotasKeysFromVigentes(rows) {
  /** @type {string[]} */
  const keys = [];
  const seen = new Set();

  for (const row of rows ?? []) {
    const key = normalizeCuotaComercialKey(row.cuotas);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  return keys;
}

/**
 * Claves de cuotas con registro activo en importaciones vigentes.
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 */
export function collectCuotasKeysFromActiveImportaciones(importaciones) {
  /** @type {string[]} */
  const keys = [];
  const seen = new Set();

  for (const imp of importaciones ?? []) {
    if (imp.estado !== "activa") continue;
    for (const record of imp.records ?? []) {
      if (record.activo === false) continue;
      const key = normalizeCuotaComercialKey(record.cuotas);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Filas comerciales según configuración guardada en Núcleo (`cuotasComercialesVisibles`).
 * Las altas/activaciones en Tablas Vigentes sincronizan esa lista vía
 * `syncCuotaComercialVisibleWithImportaciones`.
 * @param {string[] | null | undefined} visibleKeys
 */
export function buildMergedComercialCuotasKeys(visibleKeys) {
  return parseCuotasComercialesVisibles(visibleKeys);
}

/**
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 * @param {string} cuotaKey
 */
export function isCuotaActivaEnAlgunaImportacion(importaciones, cuotaKey) {
  const target = normalizeCuotaComercialKey(cuotaKey);
  if (!target) return false;

  for (const imp of importaciones ?? []) {
    if (imp.estado !== "activa") continue;
    for (const record of imp.records ?? []) {
      if (record.activo === false) continue;
      if (normalizeCuotaComercialKey(record.cuotas) === target) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filas de cuotas para la matriz comercial según configuración (incluye filas sin datos).
 * @param {string[]} visibleKeys
 */
export function buildCommercialCuotasRows(visibleKeys) {
  const keys = sortCuotasComercialesKeys(
    visibleKeys?.length > 0
      ? visibleKeys
      : [...DEFAULT_CUOTAS_COMERCIALES_VISIBLES]
  );
  return keys.map((key) => cuotaComercialKeyToDisplay(key));
}

/**
 * Cuotas adicionales presentes en datos pero fuera de los presets.
 * @param {Array<{ cuotas: string | number }>} rows
 */
export function collectExtraCuotasFromData(rows) {
  const presetKeys = new Set(CUOTAS_COMERCIALES_PRESETS.map((p) => p.key));
  /** @type {Map<string, string | number>} */
  const map = new Map();

  for (const row of rows) {
    const key = normalizeCuotaComercialKey(row.cuotas);
    if (!key || presetKeys.has(key) || isCuotaComercialSintetica(key)) continue;
    map.set(key, row.cuotas);
  }

  return [...map.entries()]
    .sort(([a], [b]) => compareCuotas(cuotaComercialKeyToDisplay(a), cuotaComercialKeyToDisplay(b)))
    .map(([key, cuotas]) => ({
      key,
      label: String(cuotas),
    }));
}

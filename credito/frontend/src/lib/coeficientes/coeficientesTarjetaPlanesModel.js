import { normalizeInstallment } from "@/lib/coeficientes/coeficientesCalculo";
import { normalizeCuotaComercialKey } from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { isManualPlanArancelGlobal } from "@/lib/coeficientes/coeficientesManualTarjetaModel";
import { formatPlanLabelFromCuotas } from "@/lib/coeficientes/coeficientesCuotaManualModel";
import {
  compareCuotas,
  normalizeCuotasLabel,
} from "@/lib/coeficientes/coeficientesVigentesModel";

/** @typedef {{ cuotas: string | number; label: string }} TarjetaPlanDefinition */

/**
 * @param {string | number} cuotas
 * @param {string} [label]
 * @returns {TarjetaPlanDefinition}
 */
function plan(cuotas, label) {
  return { cuotas, label: label ?? String(cuotas) };
}

const PLANES_DEBITO_UNA = [plan("Débito", "Débito"), plan(1, "1 cuota")];
const PLANES_2_A_12 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) =>
  plan(n, `${n} cuotas`)
);
const PLANES_ESTANDAR = [...PLANES_DEBITO_UNA, ...PLANES_2_A_12];
const PLANES_CON_18_24 = [
  ...PLANES_ESTANDAR,
  plan(18, "18 cuotas"),
  plan(24, "24 cuotas"),
];

/** Planes esperados por tarjeta automática (si no hay `importPlanes` en Firestore). */
export const DEFAULT_IMPORT_PLANES_BY_CODIGO = {
  CABAL: [...PLANES_DEBITO_UNA, ...PLANES_2_A_12],
  CLIPER: PLANES_ESTANDAR,
  AMEX: PLANES_ESTANDAR,
  FAVA: PLANES_ESTANDAR,
  VISA_MASTER_ESTANDAR: PLANES_CON_18_24,
  ACUERDO_BANCARIO: PLANES_CON_18_24,
  BANCARIAS_GENERALES: PLANES_CON_18_24,
};

/**
 * @param {string | number} a
 * @param {string | number} b
 */
export function cuotasPlanMatch(a, b) {
  const ka = normalizeCuotaComercialKey(normalizeCuotasLabel(a));
  const kb = normalizeCuotaComercialKey(normalizeCuotasLabel(b));
  return ka === kb;
}

/**
 * @param {string | number} cuotas
 */
export function planCuotasKey(cuotas) {
  return normalizeCuotaComercialKey(normalizeCuotasLabel(cuotas));
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
export function getTarjetaPlanesEsperados(tarjeta) {
  if (!tarjeta) return [];

  if (tarjeta.tipoCarga === "manual") {
    return tarjeta.manualPlanes ?? [];
  }

  const custom = tarjeta.importPlanes ?? [];
  if (custom.length > 0) {
    return custom;
  }

  return DEFAULT_IMPORT_PLANES_BY_CODIGO[tarjeta.codigo] ?? [];
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta | null | undefined} tarjeta
 * @param {string | number} cuotas
 */
export function tarjetaTienePlanCuota(tarjeta, cuotas) {
  if (!tarjeta) return false;
  return getTarjetaPlanesEsperados(tarjeta).some((plan) =>
    cuotasPlanMatch(plan.cuotas, cuotas)
  );
}

/**
 * Cuotas válidas para coeficiente comercial / vigentes.
 * Plan por defecto de la tarjeta, o cuotas extra persistidas en `importPlanes`.
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta | null | undefined} tarjeta
 * @param {string | number} cuotas
 */
export function tarjetaPermiteCuotaComercial(tarjeta, cuotas) {
  if (!tarjeta) return false;
  if (tarjeta.tipoCarga === "manual") {
    return tarjetaTienePlanCuota(tarjeta, cuotas);
  }

  const defaultPlanes = DEFAULT_IMPORT_PLANES_BY_CODIGO[tarjeta.codigo] ?? [];
  if (defaultPlanes.some((plan) => cuotasPlanMatch(plan.cuotas, cuotas))) {
    return true;
  }

  return (tarjeta.importPlanes ?? []).some((plan) =>
    cuotasPlanMatch(plan.cuotas, cuotas)
  );
}

/**
 * @param {Array<{ cuotas: string | number; coeficienteBase?: number }>} records
 * @param {string | number} planCuotas
 */
export function findImportRecordForPlan(records, planCuotas) {
  return (records ?? []).find((r) => cuotasPlanMatch(r.cuotas, planCuotas)) ?? null;
}

/**
 * @param {{ cuotas: string | number; coeficienteBase?: number } | null} record
 * @param {import("./coeficientesTarjetasModel").ManualPlanDefinition | TarjetaPlanDefinition} plan
 */
export function isPlanRecordPendiente(record, plan) {
  if (isManualPlanArancelGlobal(plan)) {
    return false;
  }
  if (!record) {
    return true;
  }
  const base = Number(record.coeficienteBase ?? 0);
  return !Number.isFinite(base) || base <= 0;
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion | null} activeImport
 */
export function countPlanesPendientes(tarjeta, activeImport) {
  if (!activeImport) {
    if (tarjeta.tipoCarga === "manual") {
      return getTarjetaPlanesEsperados(tarjeta).filter(
        (plan) => !isManualPlanArancelGlobal(plan)
      ).length;
    }
    return 0;
  }
  return getTarjetaPlanesEsperados(tarjeta).filter((plan) =>
    isPlanRecordPendiente(
      findImportRecordForPlan(activeImport.records, plan.cuotas),
      plan
    )
  ).length;
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion | null} activeImport
 */
export function buildTarjetaPlanesVigentesRows(tarjeta, activeImport) {
  const planes = getTarjetaPlanesEsperados(tarjeta);
  const records = activeImport?.records ?? [];
  const planKeys = new Set(planes.map((p) => planCuotasKey(p.cuotas)));

  /** @type {TarjetaPlanDefinition[]} */
  const extraPlanes = [];
  for (const record of records) {
    const key = planCuotasKey(record.cuotas);
    if (planKeys.has(key)) continue;
    planKeys.add(key);
    extraPlanes.push({
      cuotas: normalizeCuotasLabel(record.cuotas),
      label: formatPlanLabelFromCuotas(record.cuotas),
    });
  }

  const allPlanes = [...planes, ...extraPlanes];

  return allPlanes
    .map((plan) => {
      const record = findImportRecordForPlan(records, plan.cuotas);
      const pendiente = isPlanRecordPendiente(record, plan);
      return {
        plan,
        record,
        pendiente,
        cuotas: normalizeCuotasLabel(plan.cuotas),
        inactiva: record != null && record.activo === false,
      };
    })
    .sort((a, b) => compareCuotas(a.cuotas, b.cuotas));
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion | null} activeImport
 */
export function hasActiveImportWithPlanes(tarjeta, activeImport) {
  return Boolean(activeImport?.estado === "activa" && getTarjetaPlanesEsperados(tarjeta).length > 0);
}

/**
 * Total de planes pendientes en tarjetas con importación vigente (o manuales sin vigente).
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 */
export function countTotalPlanesPendientes(tarjetas, importaciones) {
  let total = 0;

  for (const tarjeta of tarjetas) {
    if (!tarjeta.activo || tarjeta.categoria === "EMPRESAS") continue;

    const active =
      importaciones.find(
        (imp) => imp.tarjeta === tarjeta.codigo && imp.estado === "activa"
      ) ?? null;

    if (tarjeta.tipoCarga === "automatica" && !active) continue;

    total += countPlanesPendientes(tarjeta, active);
  }

  return total;
}

/**
 * @param {string | number} cuotas
 */
export function isPlanArancelGlobalCuotas(cuotas) {
  const kind = normalizeInstallment(cuotas);
  return kind === "DEBITO" || kind === "UNA_CUOTA";
}

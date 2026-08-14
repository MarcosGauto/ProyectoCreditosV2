import { normalizeCuotaComercialKey } from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { normalizeCuotasLabel } from "@/lib/coeficientes/coeficientesVigentesModel";

/** @typedef {"DEBITO" | "1" | "NUMERICA" | "PLAN_Z" | "COMISION" | "OTRO"} CuotaManualTipo */

export const CUOTA_MANUAL_TIPOS = /** @type {const} */ ([
  { id: "DEBITO", label: "Débito" },
  { id: "1", label: "1 cuota" },
  { id: "NUMERICA", label: "Cuotas numéricas (2, 3, 6, …)" },
  { id: "PLAN_Z", label: "Plan Z" },
  { id: "COMISION", label: "Comisión" },
  { id: "OTRO", label: "Otro (texto libre)" },
]);

export const CUOTA_YA_EXISTE_ERROR = "Esta cuota ya existe.";

/**
 * @param {string | number} cuotas
 */
export function formatPlanLabelFromCuotas(cuotas) {
  const normalized = normalizeCuotasLabel(cuotas);
  const key = normalizeCuotaComercialKey(normalized);
  if (key === "DEBITO") return "Débito";
  if (key === "1") return "1 cuota";
  if (key === "PLAN Z") return "Plan Z";
  if (key === "COMISION") return "Comisión";
  const n = Number(key);
  if (Number.isFinite(n) && n > 0) return `${n} cuotas`;
  return String(normalized);
}

/**
 * @param {{
 *   tipo: CuotaManualTipo;
 *   numeroCuota?: string;
 *   textoLibre?: string;
 * }} input
 */
export function resolveCuotasFromManualForm(input) {
  switch (input.tipo) {
    case "DEBITO":
      return { cuotas: "Débito", label: "Débito" };
    case "1":
      return { cuotas: 1, label: "1 cuota" };
    case "PLAN_Z":
      return { cuotas: "Plan Z", label: "Plan Z" };
    case "COMISION":
      return { cuotas: "Comisión", label: "Comisión" };
    case "NUMERICA": {
      const n = Number(String(input.numeroCuota ?? "").replace(",", "."));
      if (!Number.isFinite(n) || n < 2) {
        throw new Error("Ingrese un número de cuotas válido (2 o más).");
      }
      const cuotas = Math.trunc(n);
      return { cuotas, label: `${cuotas} cuotas` };
    }
    case "OTRO": {
      const raw = String(input.textoLibre ?? "").trim();
      if (!raw) {
        throw new Error("Ingrese el nombre del plan.");
      }
      return { cuotas: raw, label: raw };
    }
    default:
      throw new Error("Seleccione un tipo de cuota.");
  }
}

/**
 * @param {import("./coeficientesVigentesModel").CoeficienteImportRecord | null | undefined} record
 */
export function isImportRecordActivo(record) {
  return record?.activo !== false;
}

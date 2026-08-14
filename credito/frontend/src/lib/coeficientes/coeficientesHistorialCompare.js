import { normalizeTarjetaCodigo } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { compareCuotas } from "@/lib/coeficientes/coeficientesVigentesModel";

/**
 * @param {number | null | undefined} value
 * @param {number} [decimals]
 */
export function formatHistorialCoef(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * @param {string | number} cuotas
 */
function cuotasKey(cuotas) {
  return String(cuotas).trim().toUpperCase();
}

/**
 * @param {import("./coeficientesHistorialModel").CoeficientesHistorialConsumoRow[]} historico
 * @param {Array<{ tarjeta: string; cuotas: string | number; coefFinalDisplay?: number | null }>} vigente
 * @param {string} [tarjetaFilter]
 */
export function compareConsumoHistorialVsVigente(historico, vigente, tarjetaFilter = "") {
  const filter = tarjetaFilter ? normalizeTarjetaCodigo(tarjetaFilter) : "";

  /** @type {Map<string, number | null>} */
  const vigenteMap = new Map();
  for (const row of vigente) {
    const key = `${normalizeTarjetaCodigo(row.tarjeta)}|${cuotasKey(row.cuotas)}`;
    const v = Number(row.coefFinalDisplay);
    vigenteMap.set(key, Number.isFinite(v) ? v : null);
  }

  const historicoFiltrado = filter
    ? historico.filter((r) => normalizeTarjetaCodigo(r.tarjeta) === filter)
    : historico;

  const rows = historicoFiltrado
    .map((row) => {
      const key = `${normalizeTarjetaCodigo(row.tarjeta)}|${cuotasKey(row.cuotas)}`;
      const historicoVal = Number(row.coefFinalDisplay);
      const vigenteVal = vigenteMap.get(key) ?? null;

      const h = Number.isFinite(historicoVal) ? historicoVal : null;
      const v = vigenteVal;

      let diferencia = null;
      let cambio = /** @type {"sin" | "sube" | "baja" | "nuevo" | "eliminado"} */ ("sin");

      if (h == null && v != null) {
        cambio = "nuevo";
      } else if (h != null && v == null) {
        cambio = "eliminado";
      } else if (h != null && v != null) {
        diferencia = Math.round((v - h) * 100) / 100;
        if (Math.abs(diferencia) < 0.005) {
          cambio = "sin";
          diferencia = 0;
        } else if (diferencia > 0) {
          cambio = "sube";
        } else {
          cambio = "baja";
        }
      }

      return {
        tarjeta: row.tarjeta,
        cuotas: row.cuotas,
        historico: h,
        vigente: v,
        diferencia,
        cambio,
      };
    })
    .sort((a, b) => {
      const tc = a.tarjeta.localeCompare(b.tarjeta, "es");
      if (tc !== 0) return tc;
      return compareCuotas(a.cuotas, b.cuotas);
    });

  const tarjetas = [...new Set(rows.map((r) => r.tarjeta))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  return { rows, tarjetas };
}

/**
 * @param {string} cambio
 */
export function getCompareDiffClass(cambio) {
  if (cambio === "sube") return "text-green-400";
  if (cambio === "baja") return "text-red-400";
  if (cambio === "eliminado") return "text-red-300";
  if (cambio === "nuevo") return "text-green-300";
  return "text-muted-foreground";
}

/**
 * @param {number | null} diferencia
 * @param {string} cambio
 */
export function formatCompareDiferencia(diferencia, cambio) {
  if (cambio === "sin") return "Sin cambios";
  if (cambio === "nuevo") return "Solo vigente";
  if (cambio === "eliminado") return "Solo histórico";
  if (diferencia == null || !Number.isFinite(diferencia)) return "—";
  const sign = diferencia > 0 ? "+" : "";
  return `${sign}${formatHistorialCoef(diferencia)}`;
}

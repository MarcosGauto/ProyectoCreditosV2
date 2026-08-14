import { buildTablasVigentesDisplayTable } from "@/lib/coeficientes/tablasVigentesDisplay";
import { buildVigentesFromImportaciones } from "@/lib/coeficientes/coeficientesVigentesModel";
import { getLineasActivas } from "@/lib/coeficientes/coeficientesEmpresasModel";
import { maxVigenciaDate } from "@/lib/coeficientes/coeficientesHistorialModel";

/**
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 * @param {import("./coeficientesCalculo").CoeficientesGlobales} globales
 */
export function buildConsumoHistorialPayload(importaciones, globales) {
  const activas = importaciones.filter((imp) => imp.estado === "activa");
  if (!activas.length) return null;

  const vigentesRaw = buildVigentesFromImportaciones(importaciones, globales);
  const displayTable = buildTablasVigentesDisplayTable(vigentesRaw, globales);

  const tarjetas = new Set(displayTable.map((r) => r.tarjeta));
  const fechaVigencia = maxVigenciaDate(activas.map((i) => i.vigenciaDesde));

  const coeficientes = displayTable.map((row) => ({
    tarjeta: row.tarjeta,
    cuotas: row.cuotas,
    coeficienteBase: row.coeficienteBase,
    coefPorcentajeDisplay: row.coefPorcentajeDisplay,
    arancelCreditoDisplay: row.arancelCreditoDisplay,
    interesAdicionalDisplay: row.interesAdicionalDisplay,
    coefFinalDisplay: row.coefFinalDisplay,
    vigenciaDesde:
      vigentesRaw.find(
        (v) => v.tarjeta === row.tarjeta && String(v.cuotas) === String(row.cuotas)
      )?.vigenciaDesde ?? null,
    sinArancelNiInteres: row.sinArancelNiInteres === true,
  }));

  const importacionesSnapshot = activas.map((imp) => ({
    tarjeta: imp.tarjeta,
    vigenciaDesde: imp.vigenciaDesde,
    records: imp.records.map((r) => ({
      cuotas: r.cuotas,
      coeficienteBase: r.coeficienteBase,
      interesAdicional: r.interesAdicional ?? 0,
      coeficienteFinal: r.coeficienteFinal ?? 0,
    })),
  }));

  return {
    tipo: /** @type {const} */ ("Consumo"),
    fechaVigencia,
    tarjetaCount: tarjetas.size,
    coeficienteCount: coeficientes.length,
    coeficientes,
    importacionesSnapshot,
    globalesSnapshot: { ...globales },
  };
}

/**
 * @param {import("./coeficientesEmpresasModel").EmpresaFinanciacion[]} financiaciones
 */
export function buildEmpresasHistorialPayload(financiaciones) {
  const activas = financiaciones.filter((f) => f.estado === "activa");
  if (!activas.length) return null;

  /** @type {import("./coeficientesHistorialModel").CoeficientesHistorialEmpresasRow[]} */
  const coeficientes = [];
  const productos = new Set();

  for (const fin of activas) {
    productos.add(fin.productoCodigo);
    for (const linea of getLineasActivas(fin.lineas)) {
      coeficientes.push({
        productoCodigo: fin.productoCodigo,
        lineaId: linea.id,
        lineaNombre: linea.nombre,
        plazo: linea.plazo ?? "",
        tna: linea.tna,
        comision: linea.comision,
        vigenciaDesde: fin.vigenciaDesde,
      });
    }
  }

  const empresasSnapshot = activas.map((fin) => ({
    productoCodigo: fin.productoCodigo,
    vigenciaDesde: fin.vigenciaDesde,
    lineas: fin.lineas.map((l) => ({ ...l })),
  }));

  const fechaVigencia = maxVigenciaDate(activas.map((f) => f.vigenciaDesde));

  return {
    tipo: /** @type {const} */ ("Empresas"),
    fechaVigencia,
    tarjetaCount: productos.size,
    coeficienteCount: coeficientes.length,
    coeficientes,
    empresasSnapshot,
    globalesSnapshot: null,
  };
}

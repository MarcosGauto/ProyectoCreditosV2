import {
  detectBcraMontoFormat,
  convertBcraMontoToPesos,
  logBcraMonto,
} from "../utils/bcra-monto.util.js";

const CONNECTION_ERROR_LABEL = "Error de conexión";

/**
 * @param {unknown} data
 * @returns {{
 *   denominacion: string;
 *   entidades: Array<{
 *     entidad: string;
 *     situacion: number;
 *     monto: number;
 *   }>;
 *   resumen: {
 *     entidades: number;
 *     conAtraso: number;
 *     deudaTotal: number;
 *   };
 *   montoFormato: 'PESOS';
 * }}
 */
export function mapBCRAToCleanFormat(data) {
  const source = data?.results && typeof data.results === "object" ? data.results : data;

  if (!source || typeof source !== "object") {
    throw new Error("Respuesta BCRA inválida");
  }

  const denominacion = String(source.denominacion ?? "").trim();

  if (
    !denominacion ||
    denominacion === CONNECTION_ERROR_LABEL ||
    denominacion.toLowerCase().includes("error de conexión")
  ) {
    throw new Error("Respuesta BCRA sin denominación válida");
  }

  const periodos = Array.isArray(source.periodos) ? source.periodos : [];
  const flatEntidades = Array.isArray(source.entidades) ? source.entidades : [];

  let entidadesRaw = flatEntidades;
  let usedPeriodos = false;

  if (periodos.length > 0) {
    usedPeriodos = true;
    const bestPeriod = [...periodos]
      .filter((p) => p && typeof p === "object")
      .sort((a, b) => {
        const entB = Array.isArray(b.entidades) ? b.entidades.length : 0;
        const entA = Array.isArray(a.entidades) ? a.entidades.length : 0;
        if (entB !== entA) {
          return entB - entA;
        }
        return String(b.periodo ?? "").localeCompare(String(a.periodo ?? ""));
      })[0];

    entidadesRaw = Array.isArray(bestPeriod?.entidades) ? bestPeriod.entidades : [];
  }

  const montoFormat = detectBcraMontoFormat({
    periodos: usedPeriodos ? periodos : [],
    flatEntidades: usedPeriodos ? [] : flatEntidades,
    explicitFormat: usedPeriodos ? "MILES" : null,
  });

  logBcraMonto("mapper.format", {
    montoFormat,
    usedPeriodos,
    periodosCount: periodos.length,
    entidadesCount: entidadesRaw.length,
  });

  const entidades = entidadesRaw.map((e) => {
    const { montoRaw, montoPesos, format } = convertBcraMontoToPesos(
      e?.monto,
      montoFormat
    );

    logBcraMonto("mapper.entidad", {
      entidad: e?.entidad || "Desconocida",
      montoFormat: format,
      montoRaw,
      montoPesos,
    });

    return {
      entidad: e?.entidad || "Desconocida",
      situacion: Number(e?.situacion) || 1,
      monto: montoPesos,
    };
  });

  const deudaTotal = entidades.reduce((acc, e) => acc + e.monto, 0);

  logBcraMonto("mapper.deudaTotal", {
    montoFormat,
    deudaTotal,
    entidades: entidades.length,
  });

  /** Períodos históricos (para gráficos tipo Nosis). Montos ya en pesos. */
  const periodosMapped = usedPeriodos
    ? periodos
        .filter((p) => p && typeof p === "object")
        .map((p) => {
          const ents = Array.isArray(p.entidades) ? p.entidades : [];
          return {
            periodo: String(p.periodo ?? "").trim(),
            entidades: ents.map((e) => {
              const { montoPesos } = convertBcraMontoToPesos(e?.monto, montoFormat);
              return {
                entidad: e?.entidad || "Desconocida",
                situacion: Number(e?.situacion) || 1,
                monto: montoPesos,
              };
            }),
          };
        })
        .filter((p) => p.periodo)
    : [];

  return {
    denominacion,
    entidades,
    periodos: periodosMapped,
    resumen: {
      entidades: entidades.length,
      conAtraso: entidades.filter((e) => e.situacion > 1).length,
      deudaTotal,
    },
    montoFormato: "PESOS",
  };
}

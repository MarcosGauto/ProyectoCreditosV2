import { createParseAcuerdoBancario } from "@/lib/coeficientes/parsers/parseAcuerdoBancario";
import { parseAmex } from "@/lib/coeficientes/parsers/parseAmex";
import { parseCabal } from "@/lib/coeficientes/parsers/parseCabal";
import { parseCliper } from "@/lib/coeficientes/parsers/parseCliper";
import { parseFava } from "@/lib/coeficientes/parsers/parseFava";
import { parseVisaEstandar } from "@/lib/coeficientes/parsers/parseVisaEstandar";
import {
  getParserDefinition,
  isAcuerdoBancarioParser,
  listParserOptions,
} from "@/lib/coeficientes/parsers/parserDefinitions";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import {
  getTarjetaByCodigo,
  isManualTarjeta,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import { remapParseResultForTarjeta } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserTypes").AcquirerParseResult} AcquirerParseResult */
/** @typedef {import("./parserTypes").AcquirerParserFn} AcquirerParserFn */

/** @type {Record<string, AcquirerParserFn>} */
const PARSER_BY_KEY = {
  AMEX: parseAmex,
  CABAL: parseCabal,
  VISA_MASTER_ESTANDAR: parseVisaEstandar,
  FAVA: parseFava,
  CLIPER: parseCliper,
};

/**
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
export function getParserForTarjeta(tarjeta) {
  const key = String(tarjeta.parser ?? "").toUpperCase();
  if (isAcuerdoBancarioParser(key)) {
    return createParseAcuerdoBancario(tarjeta.codigo);
  }
  return PARSER_BY_KEY[key] ?? null;
}

/**
 * @param {string | null | undefined} parserKey
 */
export function getParserForKey(parserKey) {
  const key = String(parserKey ?? "").toUpperCase();
  if (isAcuerdoBancarioParser(key)) {
    return createParseAcuerdoBancario(key);
  }
  return PARSER_BY_KEY[key] ?? null;
}

export { getParserDefinition, listParserOptions };

/**
 * @param {string} cardCodigo
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
export async function parseByAcquirer(cardCodigo, file, onProgress) {
  const tarjetas = getTarjetasCache();
  const tarjeta = getTarjetaByCodigo(tarjetas, cardCodigo);

  if (!tarjeta) {
    throw new Error(
      `Tarjeta "${cardCodigo}" no está configurada. Cree la tarjeta en Ajustes → Tarjetas.`
    );
  }

  if (isManualTarjeta(cardCodigo, tarjetas)) {
    throw new Error(
      `${tarjeta.nombre} usa carga manual en Tablas Vigentes (sin importación de archivos).`
    );
  }

  if (!tarjeta.activo) {
    throw new Error(`La tarjeta ${tarjeta.nombre} no está activa.`);
  }

  const parser = getParserForTarjeta(tarjeta);
  if (!parser) {
    throw new Error(
      `No hay parser registrado para "${tarjeta.parser}". Agregue el parser en código o elija otro.`
    );
  }

  const result = await parser(file, onProgress);
  return remapParseResultForTarjeta(result, tarjeta);
}

export { matrixToRecords as matrixColumnToRecords } from "@/lib/coeficientes/parsers/parserUtils";
export {
  countAmbiguousCells,
  matrixHasAmbiguousCells,
  isAmbiguousCell,
} from "@/lib/coeficientes/parseCoeficientesMatrix";

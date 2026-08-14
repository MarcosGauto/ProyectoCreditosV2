/**

 * Punto de entrada de importación — delega al parser del adquirente seleccionado.

 */



export { parseByAcquirer as parseCoeficientesImportFile } from "@/lib/coeficientes/parsers/parserRegistry";

export {

  getAcquirerOption,

  getImportAcquirerOptions,

  isAcquirerImplemented,

  getAcquirerDisplayLabel,

} from "@/lib/coeficientes/parsers/parserTypes";

export {

  matrixColumnToRecords,

  matrixHasAmbiguousCells,

  countAmbiguousCells,

  isAmbiguousCell,

} from "@/lib/coeficientes/parsers/parserRegistry";


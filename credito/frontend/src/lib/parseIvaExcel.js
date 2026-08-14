import { parseLabeledExcelFile } from "@/lib/parseFiscalExcel"

const IVA_LABEL_RULES = [
  {
    field: "debitoFiscal",
    patterns: [/debito\s+fiscal/i, /d[eé]bito\s+fiscal/i],
  },
  {
    field: "creditoFiscal",
    patterns: [/credito\s+fiscal/i, /cr[eé]dito\s+fiscal/i],
  },
]

/**
 * @param {File} file
 */
export function parseIvaExcelFile(file) {
  return parseLabeledExcelFile(file, IVA_LABEL_RULES)
}

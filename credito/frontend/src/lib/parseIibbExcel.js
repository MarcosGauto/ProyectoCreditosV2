import { parseLabeledExcelFile } from "@/lib/parseFiscalExcel"

const IIBB_LABEL_RULES = [
  {
    field: "baseImponible",
    patterns: [/base\s+imponible/i, /base\s+imp/i],
  },
  {
    field: "impuestoDeterminado",
    patterns: [
      /impuesto\s+determinado/i,
      /impuesto\s+a\s+pagar/i,
      /total\s+impuesto/i,
      /^impuesto$/i,
    ],
  },
  {
    field: "alicuota",
    patterns: [/al[ií]cuota/i, /tasa/i],
  },
]

/**
 * @param {File} file
 */
export function parseIibbExcelFile(file) {
  return parseLabeledExcelFile(file, IIBB_LABEL_RULES)
}

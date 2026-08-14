/**
 * Puntos por ratios financieros y métrica de cheques (misma regla que qualification legacy).
 *
 * @param {{
 *   liquidez: number | null;
 *   endeudamiento: number | null;
 *   margen: number | null;
 *   rechazosPct: number;
 * }} params
 * @returns {number}
 */
export function calculateFinancialScore({ liquidez, endeudamiento, margen, rechazosPct }) {
  let score = 0;
  if (liquidez !== null) score += liquidez >= 1.2 ? 25 : liquidez >= 1 ? 10 : 0;
  if (endeudamiento !== null) score += endeudamiento <= 1 ? 25 : endeudamiento <= 2 ? 10 : 0;
  if (margen !== null) score += margen >= 0.05 ? 15 : margen >= 0 ? 5 : 0;
  score += rechazosPct === 0 ? 15 : rechazosPct < 0.05 ? 5 : 0;
  return score;
}

/**
 * Sub-score fiscal 0–2 según cantidad de declaraciones IVA / IIBB.
 *
 * @param {unknown} iva
 * @param {unknown} iibb
 * @returns {number}
 */
export function calculateFiscalScore(iva, iibb) {
  const mesesIVA = iva?.declaraciones?.length || 0;
  const mesesIIBB = iibb?.declaraciones?.length || 0;
  return (
    (mesesIVA >= 6 ? 1 : mesesIVA >= 3 ? 0.5 : 0) +
    (mesesIIBB >= 6 ? 1 : mesesIIBB >= 3 ? 0.5 : 0)
  );
}

/**
 * Sub-score BCRA (0, 0.5 o 1) según situación general.
 *
 * @param {unknown} bcra
 * @returns {number}
 */
export function calculateBcraScore(bcra) {
  const situacionCrediticia = bcra?.situacion_general ?? 0;
  return situacionCrediticia === 1 ? 1 : situacionCrediticia === 2 ? 0.5 : 0;
}

/**
 * @param {number} score
 * @returns {"A" | "B" | "C" | "D"}
 */
export function calculateCategory(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

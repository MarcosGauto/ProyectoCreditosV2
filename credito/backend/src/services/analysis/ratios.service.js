/**
 * @param {unknown} balances
 * @returns {Record<string, unknown> | null}
 */
export function getLatestBalance(balances) {
  if (!Array.isArray(balances) || balances.length === 0) {
    return null;
  }
  const sorted = [...balances].sort((a, b) => b.periodo - a.periodo);
  return sorted[0] ?? null;
}

/**
 * @param {unknown} balance
 * @returns {number | null}
 */
export function calculateLiquidity(balance) {
  if (!balance || typeof balance !== "object") {
    return null;
  }
  const num = Number(/** @type {Record<string, unknown>} */ (balance).activo_corriente);
  const den = Number(/** @type {Record<string, unknown>} */ (balance).pasivo_corriente);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

/**
 * @param {unknown} balance
 * @returns {number | null}
 */
export function calculateDebtRatio(balance) {
  if (!balance || typeof balance !== "object") {
    return null;
  }
  const num = Number(/** @type {Record<string, unknown>} */ (balance).pasivo_total);
  const den = Number(/** @type {Record<string, unknown>} */ (balance).patrimonio);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

/**
 * @param {unknown} balance
 * @returns {number | null}
 */
export function calculateMargin(balance) {
  if (!balance || typeof balance !== "object") {
    return null;
  }
  const num = Number(/** @type {Record<string, unknown>} */ (balance).resultado_neto);
  const den = Number(/** @type {Record<string, unknown>} */ (balance).ventas);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

/**
 * @param {unknown} cheques
 * @returns {{ totalCheques: number; rechazados: number; rechazosPct: number }}
 */
export function calculateChequeMetrics(cheques) {
  const list = Array.isArray(cheques) ? cheques : [];
  const totalCheques = list.length;
  const rechazados = list.filter((c) => c.estado === "RECHAZADO").length;
  const rechazosPct = totalCheques > 0 ? rechazados / totalCheques : 0;
  return { totalCheques, rechazados, rechazosPct };
}

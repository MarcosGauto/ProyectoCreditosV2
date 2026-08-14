import {
  getLatestBalance,
  calculateLiquidity,
  calculateDebtRatio,
  calculateMargin,
  calculateChequeMetrics,
} from "./analysis/ratios.service.js";
import {
  calculateFinancialScore,
  calculateFiscalScore,
  calculateBcraScore,
  calculateCategory,
} from "./analysis/scoring.service.js";
import { getClientByCuit } from "../repositories/firestore-client.repository.js";
import { listBalancesByCuit } from "../repositories/firestore-balance.repository.js";
import { listChequesByCuit } from "../repositories/firestore-cheque.repository.js";
import { getIvaFiscalByCuit } from "../repositories/firestore-iva.repository.js";
import { getIibbFiscalByCuit } from "../repositories/firestore-iibb.repository.js";
import { getBcraByCuit } from "../repositories/firestore-bcra.repository.js";
import {
  saveQualificationByCuit,
  getQualificationByCuit,
} from "../repositories/firestore-qualification.repository.js";

export async function buildQualification(cuit) {
  // ===============================
  // 1. Obtener datos (repositories: canónico → legacy)
  // ===============================
  const [client, balances, cheques, iva, iibb, bcra] = await Promise.all([
    getClientByCuit(cuit),
    listBalancesByCuit(cuit),
    listChequesByCuit(cuit),
    getIvaFiscalByCuit(cuit),
    getIibbFiscalByCuit(cuit),
    getBcraByCuit(cuit),
  ]);

  if (!client) throw new Error("El cliente no existe");

  // ===============================
  // 2. RATIOS FINANCIEROS
  // ===============================
  const lastBalance = getLatestBalance(balances);
  const liquidez = calculateLiquidity(lastBalance);
  const endeudamiento = calculateDebtRatio(lastBalance);
  const margen = calculateMargin(lastBalance);

  // ===============================
  // 3. Cheques rechazados
  // ===============================
  const { rechazosPct } = calculateChequeMetrics(cheques);

  // ===============================
  // 4. Cumplimiento fiscal + BCRA + score
  // ===============================
  const fiscalScore = calculateFiscalScore(iva, iibb);
  const bcraScore = calculateBcraScore(bcra);

  let score = calculateFinancialScore({
    liquidez,
    endeudamiento,
    margen,
    rechazosPct,
  });
  score += fiscalScore === 2 ? 10 : fiscalScore === 1 ? 5 : 0;
  score += bcraScore === 1 ? 10 : bcraScore === 0.5 ? 5 : 0;

  const categoria = calculateCategory(score);

  // ===============================
  // 5. Guardar resultado
  // ===============================
  const result = {
    cuit,
    score,
    categoria,
    liquidez,
    endeudamiento,
    margen,
    rechazosPct,
    fiscalScore,
    bcraScore,
    timestamp: Date.now(),
  };

  await saveQualificationByCuit(cuit, result);

  return result;
}

/**
 * Lectura del último resultado persistido (`qualification/{cuit}`).
 * @param {string} cuit
 */
export async function getQualification(cuit) {
  return getQualificationByCuit(cuit);
}

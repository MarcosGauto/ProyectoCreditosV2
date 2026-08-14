/**
 * Lectura freeze-safe de cartera: empresas + credit_analysis/latest.
 * Mismo patrón que el dashboard operativo. Sin colecciones nuevas.
 */

import { collection, getDocs, limit, query } from "firebase/firestore"

import { db } from "@/service/firebase"
import { LatestRepository } from "@/lib/creditAnalysis/repositories/LatestRepository"
import {
  buildPortfolioPanels,
  normalizePortfolioRow,
} from "@/lib/portfolio/portfolioPresentation"

const EMPRESAS_PAGE_SIZE = 200

/**
 * @param {{ pageSize?: number }} [options]
 */
export async function fetchPortfolioDashboard(options = {}) {
  const pageSize = options.pageSize ?? EMPRESAS_PAGE_SIZE

  const empresasSnap = await getDocs(
    query(collection(db, "empresas"), limit(pageSize))
  )

  /** @type {ReturnType<typeof normalizePortfolioRow>[]} */
  const rows = []

  await Promise.all(
    empresasSnap.docs.map(async (empresaDoc) => {
      const cuit = empresaDoc.id
      try {
        const latest = await LatestRepository.get(cuit)
        if (!latest?.summary) return

        rows.push(
          normalizePortfolioRow({
            cuit,
            empresa: /** @type {Record<string, unknown>} */ (empresaDoc.data()),
            latest,
          })
        )
      } catch (error) {
        console.warn("[fetchPortfolioDashboard]", cuit, error)
      }
    })
  )

  const panels = buildPortfolioPanels(rows)

  return {
    scannedEmpresas: empresasSnap.size,
    analyzedCount: rows.length,
    truncated: empresasSnap.size >= pageSize,
    panels,
    rows,
  }
}

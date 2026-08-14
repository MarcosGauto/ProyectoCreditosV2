/**
 * Fila de grilla principal (clientes).
 *
 * @typedef {object} DocumentacionComercialGridRow
 * @property {string} id
 * @property {string} cuit
 * @property {string} cuitFormatted
 * @property {string} cliente
 * @property {ComercialStatus} balance
 * @property {ComercialStatus} iva
 * @property {ComercialStatus} iibb
 * @property {string | null} ultimaActualizacion
 */

/**
 * @param {import("./documentacionComercialRepository").DocumentacionEmpresaListItem} item
 * @returns {DocumentacionComercialGridRow}
 */
export function buildDocumentacionComercialGridRow(item) {
  const { cuit, empresa, financial } = item
  const balances = financial.balances ?? []
  const ivaDocs = financial.iva ?? []
  const iibbDocs = financial.iibb ?? []

  const latestBalance = /** @type {Record<string, unknown> | null} */ (
    getLatestDocument(balances)
  )
  const latestIva = /** @type {Record<string, unknown> | null} */ (
    getLatestDocument(ivaDocs)
  )
  const latestIibb = /** @type {Record<string, unknown> | null} */ (
    getLatestDocument(iibbDocs)
  )

  const ultimaMs = Math.max(
    ...[...balances, ...ivaDocs, ...iibbDocs].map((d) =>
      Math.max(
        getDocumentSortTime(d),
        toDate(d.fechaCarga)?.getTime() ?? 0,
        toDate(d.updatedAt)?.getTime() ?? 0
      )
    ),
    0
  )

  return {
    id: cuit,
    cuit,
    cuitFormatted: formatPortfolioCuit(cuit),
    cliente: resolveClienteNombre(empresa, cuit, {
      latestSummary: item.latestSummary ?? null,
      bcraDenominacion: item.bcraDenominacion ?? null,
    }),
    balance: resolveBalanceStatus(latestBalance),
    iva: resolveFiscalStatus(ivaDocs, latestIva),
    iibb: resolveFiscalStatus(iibbDocs, latestIibb),
    ultimaActualizacion:
      ultimaMs > 0 ? formatDateEs(new Date(ultimaMs)) : null,
  }
}

/**
 * Índice de búsqueda.
 * @param {{
 *   cuit: string;
 *   empresa: Record<string, unknown>;
 *   latestSummary?: Record<string, unknown> | null;
 *   bcraDenominacion?: string | null;
 * }} item
 */
export function buildDocumentacionSearchHit(item) {
  const cliente = resolveClienteNombre(item.empresa, item.cuit, {
    latestSummary: item.latestSummary ?? null,
    bcraDenominacion: item.bcraDenominacion ?? null,
  })
  return {
    id: item.cuit,
    cuit: item.cuit,
    cuitFormatted: formatPortfolioCuit(item.cuit),
    cliente,
  }
}
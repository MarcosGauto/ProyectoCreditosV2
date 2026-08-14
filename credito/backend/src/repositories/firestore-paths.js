/**
 * Rutas Firestore — referencia única para repositories.
 *
 * CANÓNICAS (objetivo de migración; el frontend ya lee `empresas/{cuit}/…`):
 * - empresas/{cuit}
 * - empresas/{cuit}/balances
 * - empresas/{cuit}/iva
 * - empresas/{cuit}/iibb
 * - empresas/{cuit}/bcra_reports
 * - empresas/{cuit}/cheques
 *
 * LEGACY (writers/readers históricos del backend; se mantienen como fallback):
 * - clients/{cuit}
 * - clientes/{cuit}/documentos  (solo frontend hoy; no usado en calificación)
 * - balances/{cuit}/items         (subcolección; reemplaza el path inválido `balances/{cuit}/items` como colección)
 * - balances                      (colección plana + campo cuit; POST /api/balance)
 * - cheques/{cuit}/items
 * - iva/{cuit}                    (documento único por CUIT)
 * - iva                           (colección plana + .add(); GET por query cuit)
 * - iibb/{cuit}, iibb             (igual que IVA)
 * - bcra/{cuit}                   (documento único con situacion_general)
 * - qualification/{cuit}          (read model del motor; sigue siendo destino de persistencia)
 *
 * TODO migración (sin implementar aún):
 * - Dual-write en balance/iva/iibb services hacia empresas/{cuit}/…
 * - Script batch: copiar balances/*, iva/*, iibb/* → subcolecciones empresas
 * - Persistir GET /api/bcra en empresas/{cuit}/bcra_reports
 * - Unificar clients → empresas/{cuit}
 * - Deprecar lectura legacy cuando métricas den 0 hits
 */

export const CANONICAL = {
  EMPRESAS: "empresas",
  SUBCOLLECTIONS: {
    BALANCES: "balances",
    IVA: "iva",
    IIBB: "iibb",
    BCRA_REPORTS: "bcra_reports",
    CHEQUES: "cheques",
  },
};

export const LEGACY = {
  CLIENTS: "clients",
  CLIENTES: "clientes",
  BALANCES: "balances",
  BALANCE_ITEMS: "items",
  CHEQUES: "cheques",
  CHEQUE_ITEMS: "items",
  IVA: "iva",
  IIBB: "iibb",
  BCRA: "bcra",
  QUALIFICATION: "qualification",
};

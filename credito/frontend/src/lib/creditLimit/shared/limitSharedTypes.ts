/**
 * Tipos compartidos del módulo creditLimit (sin dependencias internas).
 */

export type LimitFindingSeverity = "info" | "warning" | "critical"

export type LimitRestrictionAction =
  | "deny"
  | "cap"
  | "reduce_factor"
  | "require_manual"
  | "require_guarantee"

export type LimitCoverageOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists"

export interface LimitWarningTemplate {
  id: string
  text: string
  severity: LimitFindingSeverity
}


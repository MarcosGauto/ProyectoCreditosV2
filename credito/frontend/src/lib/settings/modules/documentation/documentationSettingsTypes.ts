/**
 * DocumentationSettings — módulo Ajustes › Documentación.
 */

export type CompanyTypeCode =
  | "sa"
  | "srl"
  | "sas"
  | "monotributo"
  | "responsable_inscripto"
  | "gobierno"
  | "otro"
  | (string & {})

export interface DocumentationRequirementItem {
  id: string
  code: string
  label: string
  description: string | null
  required: boolean
  /** Si true, bloquea análisis completo. */
  blocking: boolean
  order: number
}

/**
 * Requisitos documentales por tipo de empresa.
 */
export interface DocumentationByCompanyType {
  id: string
  companyType: CompanyTypeCode
  label: string
  enabled: boolean
  requirements: DocumentationRequirementItem[]
}

/**
 * Bloque Documentación dentro de un PolicyProfile.
 */
export interface DocumentationSettings {
  schemaVersion: number
  enabled: boolean
  /** Requisitos mínimos globales (todas las empresas). */
  minimumRequirements: DocumentationRequirementItem[]
  /** Requisitos adicionales / overrides por tipo. */
  byCompanyType: DocumentationByCompanyType[]
  extensions: Record<string, unknown>
}

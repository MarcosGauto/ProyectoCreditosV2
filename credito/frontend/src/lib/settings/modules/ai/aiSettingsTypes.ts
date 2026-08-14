/**
 * AiSettings — módulo Ajustes › IA.
 * Preparado para prompts configurables (futuro); sin ejecución aquí.
 */

export type AiExplanationLevel = "brief" | "standard" | "detailed" | "audit"

export interface AiRecommendationToggle {
  id: string
  code: string
  label: string
  enabled: boolean
  description: string | null
}

/**
 * Prompt configurable (contrato; el runtime de IA no vive aquí).
 */
export interface AiPromptSettings {
  id: string
  code: string
  name: string
  description: string | null
  enabled: boolean
  /**
   * Plantilla de prompt. Placeholders futuros: {{score}}, {{trace}}, etc.
   */
  template: string
  locale: string
  version: number
}

export interface AiSettings {
  schemaVersion: number
  enabled: boolean
  explanationLevel: AiExplanationLevel
  /** Si true, IA puede sugerir acciones (no auto-aplicar). */
  recommendationsEnabled: boolean
  recommendationToggles: AiRecommendationToggle[]
  prompts: AiPromptSettings[]
  /**
   * Modelo / provider keys son referencias, no secretos.
   * Secretos → vault / env (fuera de Ajustes tipado).
   */
  modelRef: string | null
  extensions: Record<string, unknown>
}


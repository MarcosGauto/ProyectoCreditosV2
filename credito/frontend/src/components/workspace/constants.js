import {
  Building2,
  FileStack,
  Landmark,
  LayoutDashboard,
  Scale,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react"

/** @typedef {"resumen"|"empresa"|"documentacion"|"financiero"|"bcra"|"nosis"|"ia"|"cobertura"|"historial"} AnalysisWorkspaceSectionId */

/**
 * Secciones del workspace (solo metadatos de UI).
 * Historial se abre desde el header (junto a Guardar), no como pestaña.
 * @type {{ id: AnalysisWorkspaceSectionId; label: string; icon: import("lucide-react").LucideIcon }[]}
 */
export const ANALYSIS_WORKSPACE_SECTIONS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "documentacion", label: "Documentación", icon: FileStack },
  { id: "financiero", label: "Financiero", icon: Wallet },
  { id: "bcra", label: "BCRA", icon: Landmark },
  { id: "nosis", label: "Nosis", icon: Shield },
  { id: "ia", label: "IA", icon: Sparkles },
  { id: "cobertura", label: "Cobertura y decisión", icon: Scale },
]

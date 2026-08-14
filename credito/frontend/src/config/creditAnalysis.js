/** Oculta capacidad financiera en pantalla, informe y PDF. */
export const SHOW_CAPACIDAD_FINANCIERA = false

/** Porcentajes sobre patrimonio / flujo IVA (0.3 = 30%, 0.2 = 20%). */
export const CREDIT_CONFIG = {
  porcentajePatrimonio: 0.3,
  porcentajeFlujoIVA: 0.2,
}

/** Umbrales para semáforos de capacidad económica. */
export const CREDIT_THRESHOLDS = {
  endeudamiento: {
    goodMax: 0.5,
    mediumMax: 0.7,
  },
  liquidez: {
    goodMin: 1.5,
    mediumMin: 1,
  },
}

export const SEMAPHORE_STYLES = {
  good: { emoji: "🟢", label: "Bueno", className: "text-green-400" },
  medium: { emoji: "🟡", label: "Medio", className: "text-yellow-400" },
  risky: { emoji: "🔴", label: "Riesgoso", className: "text-red-400" },
  unknown: { emoji: "⚪", label: "Sin dato", className: "text-muted-foreground" },
}

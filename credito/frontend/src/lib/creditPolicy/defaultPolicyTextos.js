/** @typedef {import("./creditPolicyTypes").CreditPolicyTextos} CreditPolicyTextos */

/** @type {CreditPolicyTextos} */
export const DEFAULT_POLICY_TEXTOS = {
  dictamenPatrimonial: {
    bueno:
      "La estructura patrimonial presenta indicadores sólidos, con liquidez de {liquidez} y endeudamiento de {endeudamiento}%. La evolución del patrimonio neto es favorable.",
    medio:
      "La estructura patrimonial presenta indicadores aceptables, con liquidez de {liquidez} y endeudamiento de {endeudamiento}%. Se recomienda monitorear la evolución patrimonial.",
    riesgoso:
      "La estructura patrimonial evidencia señales de deterioro financiero, con liquidez de {liquidez} y endeudamiento de {endeudamiento}%. Se sugiere un análisis crediticio conservador.",
  },
  comentarioBalance: {
    bueno:
      "La compañía presenta una situación financiera saludable, con solvencia de {solvencia} y patrimonio neto de {patrimonio}.",
    medio:
      "Se observan indicadores estables, aunque con aspectos patrimoniales que requieren seguimiento (liquidez {liquidez}, endeudamiento {endeudamiento}%).",
    riesgoso:
      "Se observa deterioro patrimonial y/o elevados niveles de endeudamiento ({endeudamiento}%). Capacidad financiera estimada: {capacidadFinanciera}.",
  },
  conclusionEvolutiva: {
    crecimiento:
      "La evolución del patrimonio neto resulta favorable respecto del ejercicio anterior.",
    estable:
      "La evolución del patrimonio neto se mantiene dentro de parámetros normales.",
    caida:
      "Se observa una reducción patrimonial respecto del ejercicio anterior.",
  },
  resultadoFinal: {
    aprobado:
      "El análisis crediticio arroja un resultado favorable (score financiero {scoreFinanciero}, NOSIS {scoreNosis}).",
    observado:
      "El análisis presenta observaciones que requieren seguimiento (score financiero {scoreFinanciero}, NOSIS {scoreNosis}).",
    riesgoso:
      "El análisis evidencia señales de riesgo crediticio (score financiero {scoreFinanciero}, NOSIS {scoreNosis}).",
    sinCobertura:
      "No cumple los requisitos de cobertura. Capacidad financiera estimada: {capacidadFinanciera}.",
    nominadoConCobertura:
      "Operación nominada con cobertura. Capacidad financiera estimada: {capacidadFinanciera}.",
    discrecionalConCobertura:
      "Operación discrecional con cobertura. Capacidad financiera estimada: {capacidadFinanciera}.",
  },
}

export const POLICY_TEXT_PLACEHOLDER_HINTS = [
  "{liquidez}",
  "{endeudamiento}",
  "{solvencia}",
  "{patrimonio}",
  "{scoreFinanciero}",
  "{scoreNosis}",
  "{capacidadFinanciera}",
]

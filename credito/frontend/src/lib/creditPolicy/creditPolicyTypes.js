/**
 * @typedef {"higher" | "lower"} CreditPolicyIndicatorMode
 */

/**
 * @typedef {Object} CreditPolicyIndicator
 * @property {string} id
 * @property {string} nombre
 * @property {string} formula
 * @property {string} fuente
 * @property {number} good
 * @property {number} medium
 * @property {number} peso
 * @property {boolean} impactaScore
 * @property {boolean} activo
 * @property {CreditPolicyIndicatorMode} [modo]
 */

/**
 * @typedef {Object} CreditPolicyEstadoGeneral
 * @property {number} scoreFinancieroPeso
 * @property {number} scoreNosisPeso
 * @property {boolean} incluirNosisEnCalculo — MVP: false. Futuro: factor opcional vía config.
 */

/**
 * @typedef {Object} CreditPolicyScorePropioEscalas
 * @property {number} excelenteMin
 * @property {number} muyBuenoMin
 * @property {number} aceptableMin
 * @property {number} riesgoMin
 */

/**
 * @typedef {Object} CreditPolicyScorePropio
 * @property {string} scoreModel — ej. "SC-1.0"
 * @property {CreditPolicyScorePropioEscalas} escalas
 */

/**
 * @typedef {Object} CreditPolicyReglasCobertura
 * @property {number} antiguedadMinimaAnios
 * @property {number} mesesSinAtrasos
 * @property {number} facturasContadoMinimas
 * @property {boolean} exigirSinChequesRechazados
 */

/**
 * @typedef {Object} CreditPolicyReglasCredito
 * @property {number} porcentajeCapacidadVentas
 * @property {number} porcentajeCapacidadPatrimonio
 * @property {number} [porcentajeCapacidadFlujoIVA]
 */

/**
 * @typedef {Object} CreditPolicyConfiguracionNosis
 * @property {number} scoreAprobadoMinimo
 * @property {number} scoreObservadoMinimo
 */

/**
 * @typedef {Object} CreditPolicyTextosDictamen
 * @property {string} bueno
 * @property {string} medio
 * @property {string} riesgoso
 */

/**
 * @typedef {Object} CreditPolicyTextosConclusionEvolutiva
 * @property {string} crecimiento
 * @property {string} estable
 * @property {string} caida
 */

/**
 * @typedef {Object} CreditPolicyTextosResultadoFinal
 * @property {string} aprobado
 * @property {string} observado
 * @property {string} riesgoso
 * @property {string} sinCobertura
 * @property {string} nominadoConCobertura
 * @property {string} discrecionalConCobertura
 */

/**
 * @typedef {Object} CreditPolicyTextos
 * @property {CreditPolicyTextosDictamen} dictamenPatrimonial
 * @property {CreditPolicyTextosDictamen} comentarioBalance
 * @property {CreditPolicyTextosConclusionEvolutiva} conclusionEvolutiva
 * @property {CreditPolicyTextosResultadoFinal} resultadoFinal
 */

/**
 * @typedef {Object} CreditPolicy
 * @property {string} id
 * @property {number} version
 * @property {CreditPolicyEstadoGeneral} estadoGeneral
 * @property {CreditPolicyIndicator[]} indicadoresFinancieros
 * @property {CreditPolicyReglasCobertura} reglasCobertura
 * @property {CreditPolicyReglasCredito} reglasCredito
 * @property {CreditPolicyConfiguracionNosis} configuracionNosis
 * @property {CreditPolicyScorePropio} scorePropio
 * @property {CreditPolicyTextos} textos
 * @property {string | null} [updatedAt]
 * @property {string | null} [updatedBy]
 */

export {}

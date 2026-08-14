/** @typedef {import("./creditPolicyTypes").CreditPolicy} CreditPolicy */
/** @typedef {import("./creditPolicyTypes").CreditPolicyIndicator} CreditPolicyIndicator */

import { DEFAULT_POLICY_TEXTOS } from "@/lib/creditPolicy/defaultPolicyTextos"
import { normalizePolicyTextos } from "@/lib/creditPolicy/creditPolicyTextEngine"

/** @type {CreditPolicyIndicator[]} */
export const DEFAULT_FINANCIAL_INDICATORS = [  {
    id: "liquidez_corriente",
    nombre: "Liquidez Corriente",
    formula: "AC / PC",
    fuente: "Balance",
    good: 1.5,
    medium: 1,
    peso: 25,
    impactaScore: true,
    activo: true,
    modo: "higher",
  },
  {
    id: "endeudamiento",
    nombre: "Endeudamiento",
    formula: "PT / AT",
    fuente: "Balance",
    good: 0.5,
    medium: 0.7,
    peso: 25,
    impactaScore: true,
    activo: true,
    modo: "lower",
  },
  {
    id: "capital_trabajo",
    nombre: "Capital de Trabajo",
    formula: "AC - PC",
    fuente: "Balance",
    good: 0,
    medium: 0,
    peso: 0,
    impactaScore: false,
    activo: true,
    modo: "higher",
  },
  {
    id: "solvencia",
    nombre: "Solvencia",
    formula: "AT / PT",
    fuente: "Balance",
    good: 2,
    medium: 1.5,
    peso: 0,
    impactaScore: false,
    activo: true,
    modo: "higher",
  },
  {
    id: "participacion_patrimonial",
    nombre: "Participación Patrimonial",
    formula: "PN / AT",
    fuente: "Balance",
    good: 0.3,
    medium: 0.15,
    peso: 25,
    impactaScore: true,
    activo: true,
    modo: "higher",
  },
  {
    id: "cobertura_patrimonial",
    nombre: "Cobertura Patrimonial",
    formula: "PN / PT",
    fuente: "Balance",
    good: 1,
    medium: 0.5,
    peso: 0,
    impactaScore: false,
    activo: true,
    modo: "higher",
  },
  {
    id: "evolucion_patrimonial",
    nombre: "Evolución Patrimonial",
    formula: "((PN act - PN ant) / PN ant) × 100",
    fuente: "Balance",
    good: 50,
    medium: 30,
    peso: 25,
    impactaScore: true,
    activo: true,
    modo: "higher",
  },
]

/** @returns {CreditPolicy} */
export function createDefaultCreditPolicy() {
  return {
    id: "active_policy",
    version: 1,
    estadoGeneral: {
      scoreFinancieroPeso: 65,
      scoreNosisPeso: 35,
    },
    indicadoresFinancieros: DEFAULT_FINANCIAL_INDICATORS.map((row) => ({
      ...row,
    })),
    reglasCobertura: {
      antiguedadMinimaAnios: 2,
      mesesSinAtrasos: 24,
      facturasContadoMinimas: 3,
      exigirSinChequesRechazados: true,
    },
    reglasCredito: {
      porcentajeCapacidadVentas: 15,
      porcentajeCapacidadPatrimonio: 30,
      porcentajeCapacidadFlujoIVA: 20,
    },
    configuracionNosis: {
      scoreAprobadoMinimo: 70,
      scoreObservadoMinimo: 40,
    },
    textos: normalizePolicyTextos(DEFAULT_POLICY_TEXTOS),
    updatedAt: null,
    updatedBy: null,
  }
}

export const DEFAULT_CREDIT_POLICY = createDefaultCreditPolicy()

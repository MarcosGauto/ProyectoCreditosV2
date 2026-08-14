/**
 * Datos iniciales para colección vacía (solo bootstrap, no catálogo en runtime).
 * Campos canónicos: activo, orden, parser, tipoCarga.
 */

/** @type {Array<Record<string, unknown>>} */
export const COEFICIENTES_TARJETAS_SEED = [
  {
    codigo: "AMEX",
    nombre: "AMEX",
    tipoCarga: "automatica",
    parser: "AMEX",
    manualPlanes: [],
    orden: 10,
    activo: true,
  },
  {
    codigo: "CABAL",
    nombre: "CABAL",
    tipoCarga: "automatica",
    parser: "CABAL",
    manualPlanes: [],
    orden: 20,
    activo: true,
  },
  {
    codigo: "VISA_MASTER_ESTANDAR",
    nombre: "Visa / Master Estándar",
    tipoCarga: "automatica",
    parser: "VISA_MASTER_ESTANDAR",
    manualPlanes: [],
    orden: 30,
    activo: true,
  },
  {
    codigo: "ACUERDO_BANCARIO",
    nombre: "Acuerdo Bancario",
    tipoCarga: "automatica",
    parser: "ACUERDO_BANCARIO",
    manualPlanes: [],
    orden: 40,
    activo: true,
  },
  {
    codigo: "BANCARIAS_GENERALES",
    nombre: "Bancarias Generales",
    tipoCarga: "automatica",
    parser: "BANCARIAS_GENERALES",
    manualPlanes: [],
    orden: 50,
    activo: true,
  },
  {
    codigo: "CLIPER",
    nombre: "CLIPER",
    tipoCarga: "automatica",
    parser: "CLIPER",
    manualPlanes: [],
    orden: 60,
    activo: true,
  },
  {
    codigo: "FAVA",
    nombre: "FavaCard",
    tipoCarga: "automatica",
    parser: "FAVA",
    manualPlanes: [],
    orden: 70,
    activo: true,
  },
  {
    codigo: "NARANJA",
    nombre: "NARANJA",
    tipoCarga: "manual",
    parser: null,
    manualPlanes: [
      { cuotas: 6, label: "6 Cuotas" },
      { cuotas: 12, label: "12 Cuotas" },
      { cuotas: "Plan Z", label: "Plan Z" },
    ],
    orden: 80,
    activo: true,
  },
  {
    codigo: "MERCADO_PAGO",
    nombre: "Mercado Pago",
    tipoCarga: "manual",
    parser: null,
    manualPlanes: [
      { cuotas: 3, label: "3 Cuotas" },
      { cuotas: 6, label: "6 Cuotas" },
      { cuotas: 12, label: "12 Cuotas" },
    ],
    orden: 85,
    activo: true,
    coefFinalDirecto: true,
  },
];

/** Productos EMPRESAS en catálogo de tarjetas. */
export const COEFICIENTES_EMPRESAS_TARJETAS_SEED = [
  {
    codigo: "PACTAR",
    nombre: "Pactar",
    categoria: "EMPRESAS",
    tipoCarga: "manual",
    parser: null,
    manualPlanes: [],
    orden: 100,
    activo: true,
  },
  {
    codigo: "PYMENACION",
    nombre: "Pymenación",
    categoria: "EMPRESAS",
    tipoCarga: "manual",
    parser: null,
    manualPlanes: [],
    orden: 110,
    activo: true,
  },
  {
    codigo: "BNA_CONECTA",
    nombre: "BNA Conecta",
    categoria: "EMPRESAS",
    tipoCarga: "manual",
    parser: null,
    manualPlanes: [],
    orden: 120,
    activo: true,
  },
];

/** Datos iniciales TNA / comisión por producto. */
export const COEFICIENTES_EMPRESAS_FINANCIACION_SEED = [
  {
    productoCodigo: "PACTAR",
    vigenciaDesde: "2026-01-01",
    lineas: [
      {
        id: "PACTAR_90",
        nombre: "Bip Empresas",
        plazo: "90 días",
        tna: 34,
        comision: 1.8,
        observaciones: "",
        orden: 1,
        activo: true,
      },
      {
        id: "PACTAR_180",
        nombre: "Bip Empresas",
        plazo: "180 días",
        tna: 34,
        comision: 1.8,
        observaciones: "",
        orden: 2,
        activo: true,
      },
    ],
  },
  {
    productoCodigo: "PYMENACION",
    vigenciaDesde: "2026-01-01",
    lineas: [
      {
        id: "PYMENACION_12",
        nombre: "Hasta 12 cuotas",
        plazo: "",
        tna: 29,
        comision: 1.8,
        observaciones: "",
        orden: 1,
        activo: true,
      },
      {
        id: "PYMENACION_12_FIJAS",
        nombre: "12 cuotas",
        plazo: "",
        tna: 29,
        comision: 1.8,
        observaciones: "",
        orden: 2,
        activo: true,
      },
    ],
  },
  {
    productoCodigo: "BNA_CONECTA",
    vigenciaDesde: "2026-01-01",
    lineas: [
      {
        id: "BNA_CONECTA_STD",
        nombre: "BNA Conecta",
        tna: 29,
        comision: 0.8,
        observaciones: "",
        orden: 1,
        activo: true,
      },
    ],
  },
];

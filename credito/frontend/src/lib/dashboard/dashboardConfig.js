import {
  Banknote,
  Calculator,
  CreditCard,
  DollarSign,
  FileSearch,
  Landmark,
  LineChart,
  Percent,
  Scale,
  Wallet,
} from "lucide-react"

/** @typedef {import("lucide-react").LucideIcon} LucideIcon */

/**
 * @typedef {object} DashboardQuickAccessItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} href
 * @property {LucideIcon} icon
 */

/** @type {DashboardQuickAccessItem[]} */
export const DASHBOARD_QUICK_ACCESS = [
  {
    id: "nueva-calificacion",
    title: "Nueva Calificación",
    description: "Iniciar análisis crediticio por CUIT",
    href: "/dashboard/documentation",
    icon: FileSearch,
  },
  {
    id: "cuenta-corriente",
    title: "Cuenta Corriente",
    description: "Cálculo y registro de operaciones",
    href: "/dashboard/cuenta-orden",
    icon: Wallet,
  },
  {
    id: "historial-usd",
    title: "Historial USD",
    description: "Cotizaciones y evolución del dólar",
    href: "/dashboard/usdhistory",
    icon: LineChart,
  },
  {
    id: "diferencia-usd",
    title: "Diferencia USD",
    description: "Análisis de diferencias cambiarias",
    href: "/dashboard/exchange",
    icon: DollarSign,
  },
  {
    id: "financiacion",
    title: "Financiación",
    description: "Simulación de tasas y cuotas",
    href: "/dashboard/financing",
    icon: Calculator,
  },
  {
    id: "cheques-rechazados",
    title: "Cheques Rechazados",
    description: "Seguimiento de incidencias comerciales",
    href: "/dashboard/cheques-rechazados",
    icon: Banknote,
  },
  {
    id: "coeficientes",
    title: "Coeficientes",
    description: "Tablas de coeficientes y tarjetas",
    href: "/dashboard/creditCalculator",
    icon: Percent,
  },
]

/**
 * @typedef {object} DashboardKpiDefinition
 * @property {string} id
 * @property {string} title
 * @property {LucideIcon} icon
 * @property {string} [href]
 */

/** @type {DashboardKpiDefinition[]} */
export const DASHBOARD_KPI_DEFINITIONS = [
  {
    id: "cuentaCorriente",
    title: "Cuenta Corriente",
    icon: Wallet,
    href: "/dashboard/cuenta-orden",
  },
  {
    id: "diferenciaUsd",
    title: "Diferencia USD",
    icon: DollarSign,
    href: "/dashboard/exchange",
  },
  {
    id: "financiaciones",
    title: "Financiaciones activas",
    icon: Landmark,
    href: "/dashboard/financing",
  },
  {
    id: "calificaciones",
    title: "Calificaciones Crediticias",
    icon: Scale,
    href: "/dashboard/documentation",
  },
  {
    id: "chequesRechazados",
    title: "Cheques Rechazados",
    icon: Banknote,
    href: "/dashboard/cheques-rechazados",
  },
  {
    id: "coeficientes",
    title: "Coeficientes",
    icon: CreditCard,
    href: "/dashboard/creditCalculator",
  },
]

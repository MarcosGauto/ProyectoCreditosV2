"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Settings, Table2, Upload, CreditCard, Building2, Archive } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dashboard/ajustes/coeficientes/configuracion-general",
    label: "Configuración General",
    icon: Settings,
  },
  {
    href: "/dashboard/ajustes/coeficientes/tarjetas",
    label: "Tarjetas (Consumo)",
    icon: CreditCard,
  },
  {
    href: "/dashboard/ajustes/coeficientes/financiacion-empresas",
    label: "Financiación Empresas",
    icon: Building2,
  },
  {
    href: "/dashboard/ajustes/coeficientes/importar",
    label: "Importar Coeficientes",
    icon: Upload,
  },
  {
    href: "/dashboard/ajustes/coeficientes/historial",
    label: "Historial de Importaciones",
    icon: History,
  },
  {
    href: "/dashboard/ajustes/coeficientes/historial-vigencias",
    label: "Historial de Vigencias",
    icon: Archive,
  },
  {
    href: "/dashboard/ajustes/coeficientes/tablas-vigentes",
    label: "Tablas Vigentes",
    icon: Table2,
  },
];

export function CoeficientesModuleNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-red-500/15 text-red-300 border border-red-500/30"
                : "bg-muted text-muted-foreground border border-border hover:text-foreground hover:border-zinc-600"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

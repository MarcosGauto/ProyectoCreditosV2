"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Calculator,
  CreditCard,
  FileText,
  Archive,
  Users,
  LogOut,
} from "lucide-react";

const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Cuenta y Orden",
    href: "/CalculoCuentaOrden",
    icon: Users,
  },
  {
    title: "Histórico USD",
    href: "/usd-history",
    icon: DollarSign,
  },
  {
    title: "Diferencia USD",
    href: "/exchange",
    icon: Calculator,
  },
  {
    title: "Coeficiente Tarjetas",
    href: "/coefficient",
    icon: CreditCard,
  },
  {
    title: "Calificación Crediticia",
    href: "/documentation",
    icon: FileText,
  },
  {
    title: "Cálculo Tasas",
    href: "/financing",
    icon: Archive,
  },
];

export default function Sidebar({ handleLogout }) {
  const pathname = usePathname();

  return (
    <aside className="w-72 min-h-screen bg-card border-r border-border flex flex-col justify-between p-5">
      
      {/* TOP */}
      <div>
        
        {/* LOGO */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Grupo<span className="text-red-500">Nucleo</span>
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Gestión financiera
          </p>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.title}
                href={item.href}
                className={`
                  group
                  flex
                  items-center
                  gap-4
                  rounded-2xl
                  px-4
                  py-3
                  transition-all
                  duration-300
                  border
                  ${
                    isActive
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />

                <span className="font-medium text-sm">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM */}
      <button
        onClick={handleLogout}
        className="
          flex
          items-center
          gap-4
          rounded-2xl
          px-4
          py-3
          text-muted-foreground
          hover:bg-red-500/10
          hover:text-red-400
          transition-all
          duration-300
          border
          border-transparent
          hover:border-red-500/20
        "
      >
        <LogOut className="w-5 h-5" />

        <span className="font-medium text-sm">
          Cerrar sesión
        </span>
      </button>
    </aside>
  );
}
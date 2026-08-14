"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/app/context/AuthContext";
import { canAccess } from "@/lib/auth/permissions";
import { roleLabel } from "@/lib/auth/usersModel";
import { logoutUser } from "@/service/firebase";

function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, displayName, loading, isAdmin } = useAuth();

  const isAjustesRoute = pathname?.startsWith("/dashboard/ajustes") ?? false;
  const isCoeficientesRoute =
    pathname?.startsWith("/dashboard/ajustes/coeficientes") ?? false;
  const [ajustesOpen, setAjustesOpen] = useState(isAjustesRoute);
  const [coeficientesOpen, setCoeficientesOpen] = useState(isCoeficientesRoute);

  useEffect(() => {
    if (isAjustesRoute) {
      setAjustesOpen(true);
    }
    if (isCoeficientesRoute) {
      setCoeficientesOpen(true);
    }
  }, [isAjustesRoute, isCoeficientesRoute]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const showCalificacion = canAccess(role, "CALIFICACION_CREDITICIA");
  const showCoeficientes = canAccess(role, "VISUALIZAR_COEFICIENTES");

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">
            Grupo<span className="text-red-500">Nucleo</span>
          </h1>
          <p className="text-muted-foreground text-sm">Gestión financiera</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/dashboard" active={pathname === "/dashboard"}>
            Dashboard
          </NavLink>

          <NavLink
            href="/dashboard/cuenta-orden"
            active={pathname?.startsWith("/dashboard/cuenta-orden")}
          >
            Cuenta y Orden
          </NavLink>

          <NavLink
            href="/dashboard/usdhistory"
            active={pathname?.startsWith("/dashboard/usdhistory")}
          >
            Histórico USD
          </NavLink>

          <NavLink
            href="/dashboard/exchange"
            active={pathname?.startsWith("/dashboard/exchange")}
          >
            Diferencia USD
          </NavLink>

          {showCoeficientes && (
            <NavLink
              href="/dashboard/creditCalculator"
              active={pathname?.startsWith("/dashboard/creditCalculator")}
            >
              Coeficientes
            </NavLink>
          )}

          <NavLink
            href="/dashboard/financing"
            active={pathname?.startsWith("/dashboard/financing")}
          >
            Financiacion
          </NavLink>

          {showCalificacion && (
            <NavLink
              href="/dashboard/documentation"
              active={pathname?.startsWith("/dashboard/documentation")}
            >
              Calificacion Crediticia
            </NavLink>
          )}

          <NavLink
            href="/dashboard/cheques-rechazados"
            active={pathname?.startsWith("/dashboard/cheques-rechazados")}
          >
            Cheques Rechazados
          </NavLink>

          {(showCalificacion || canAccess(role, "CONSULTAS")) && (
            <NavLink
              href="/dashboard/revision-rapida-cheques"
              active={pathname?.startsWith("/dashboard/revision-rapida-cheques")}
            >
              Revisión Rápida
            </NavLink>
          )}

          {isAdmin && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setAjustesOpen((open) => !open)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isAjustesRoute
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    ajustesOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden
                />
                Ajustes
              </button>

              {ajustesOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">
                  <Link
                    href="/dashboard/ajustes/configuracion-crediticia"
                    className={`block px-4 py-2.5 rounded-lg text-sm transition ${
                      pathname?.startsWith(
                        "/dashboard/ajustes/configuracion-crediticia"
                      )
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Configuración Crediticia
                  </Link>

                  <Link
                    href="/dashboard/ajustes/usuarios-y-roles"
                    className={`block px-4 py-2.5 rounded-lg text-sm transition ${
                      pathname?.startsWith(
                        "/dashboard/ajustes/usuarios-y-roles"
                      )
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Usuarios y Roles
                  </Link>

                  <Link
                    href="/dashboard/ajustes/tarjetas"
                    className={`block px-4 py-2.5 rounded-lg text-sm transition ${
                      pathname?.startsWith("/dashboard/ajustes/tarjetas") ||
                      pathname?.startsWith(
                        "/dashboard/ajustes/coeficientes/tarjetas"
                      )
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Tarjetas
                  </Link>

                  <button
                    type="button"
                    onClick={() => setCoeficientesOpen((open) => !open)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition ${
                      isCoeficientesRoute
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                        coeficientesOpen ? "rotate-90" : ""
                      }`}
                      aria-hidden
                    />
                    Coeficientes
                  </button>

                  {coeficientesOpen && (
                    <div className="ml-3 pl-3 border-l border-border space-y-1">
                      <Link
                        href="/dashboard/ajustes/coeficientes/configuracion-general"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/configuracion-general"
                          )
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Configuración General
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/importar"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/importar"
                          )
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Importar Coeficientes
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/historial"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname === "/dashboard/ajustes/coeficientes/historial"
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Historial de Importaciones
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/historial-vigencias"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/historial-vigencias"
                          )
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Historial de Vigencias
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/tablas-vigentes"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/tablas-vigentes"
                          )
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Tablas Vigentes
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/tarjetas"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/tarjetas"
                          ) || pathname?.startsWith("/dashboard/ajustes/tarjetas")
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Tarjetas (Consumo)
                      </Link>
                      <Link
                        href="/dashboard/ajustes/coeficientes/financiacion-empresas"
                        className={`block px-4 py-2 rounded-lg text-sm transition ${
                          pathname?.startsWith(
                            "/dashboard/ajustes/coeficientes/financiacion-empresas"
                          )
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        Financiación Empresas
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => void handleLogout()}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background">
        <div className="flex h-auto min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:min-h-20 sm:gap-4 sm:px-8">
          <input
            placeholder="Buscar..."
            className="h-11 w-full max-w-md rounded-xl border border-border bg-background px-4 text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="text-right text-sm">
              {loading ? (
                <span className="text-muted-foreground">Cargando sesión…</span>
              ) : user ? (
                <div className="hidden rounded-xl border border-border bg-muted/50 px-3 py-2 sm:block sm:px-4">
                  <p className="font-medium text-foreground">
                    Usuario: {displayName || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email: {user.email ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rol: {roleLabel(role)}
                  </p>
                </div>
              ) : (
                <Link href="/login" className="text-primary hover:text-primary/80">
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Table2 } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesVigentes } from "@/hooks/useCoeficientesVigentes";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import { CoeficientesManualTarjetaPanel } from "@/components/backoffice/coeficientes/CoeficientesManualTarjetaPanel";
import { CoeficientesImportTarjetaPanel } from "@/components/backoffice/coeficientes/CoeficientesImportTarjetaPanel";
import { CoeficientesCuotasComercialesSection } from "@/components/backoffice/coeficientes/CoeficientesCuotasComercialesSection";
import { CoeficientesAgregarCuotaModal } from "@/components/backoffice/coeficientes/CoeficientesAgregarCuotaModal";
import { formatInteresFactor } from "@/lib/coeficientes/coeficientesCalculo";
import { countTotalPlanesPendientes } from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";
import { Button } from "@/components/ui/button";

export function CoeficientesTablasVigentesPage() {
  const { user, isAdmin } = useAuth();
  const { vigentesRaw, importaciones, loading, error, globales, basePrice } =
    useCoeficientesVigentes();
  const { tarjetas, manualTarjetas, importTarjetas } = useCoeficientesTarjetas();
  const [modalOpen, setModalOpen] = useState(false);

  const importacionesActivas = useMemo(
    () =>
      importTarjetas.filter((tarjeta) =>
        importaciones.some(
          (imp) => imp.tarjeta === tarjeta.codigo && imp.estado === "activa"
        )
      ),
    [importTarjetas, importaciones]
  );

  const pendientesTotal = useMemo(
    () => countTotalPlanesPendientes(tarjetas, importaciones),
    [tarjetas, importaciones]
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando tablas vigentes…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Table2 className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Tablas Vigentes</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Coef. % = (Coef. Base − 1) × 100. Coef. Final = (Coef. % + Arancel
            Crédito) × Interés Aplicado. Mercado Pago: Coef. Final = Coef. %
            (sin arancel ni interés). Cada tarjeta tiene su panel para revisar
            planes, completar cuotas faltantes y guardar sin reimportar.
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-500 text-white shrink-0"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar cuota
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {pendientesTotal > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Hay {pendientesTotal} plan{pendientesTotal === 1 ? "" : "es"} pendiente
          {pendientesTotal === 1 ? "" : "s"} de completar en los paneles de tarjeta
          (filas resaltadas en amarillo).
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Interés adicional vigente: {formatInteresFactor(globales.interes)} · Arancel
        débito: {globales.arancelDeb}% · Arancel crédito: {globales.arancelCre}%
      </p>

      {importacionesActivas.map((tarjeta) => (
        <CoeficientesImportTarjetaPanel
          key={tarjeta.codigo}
          tarjeta={tarjeta}
          importaciones={importaciones}
          basePrice={basePrice}
        />
      ))}

      {manualTarjetas.map((tarjeta) => (
        <CoeficientesManualTarjetaPanel
          key={tarjeta.codigo}
          tarjeta={tarjeta}
          importaciones={importaciones}
        />
      ))}

      <CoeficientesCuotasComercialesSection vigentesRows={vigentesRaw} />

      <CoeficientesAgregarCuotaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tarjetas={tarjetas}
        globales={globales}
        basePrice={basePrice}
        userEmail={user?.email ?? null}
      />
    </div>
  );
}

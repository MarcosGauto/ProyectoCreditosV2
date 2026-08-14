"use client";



import { useMemo, useState } from "react";

import Link from "next/link";

import { FileDown, Loader2, Settings } from "lucide-react";



import { useCoeficientesVigentes } from "@/hooks/useCoeficientesVigentes";

import { useCoeficientesEmpresas } from "@/hooks/useCoeficientesEmpresas";

import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";

import { ComercialConsumoTables } from "@/components/coeficientes/ComercialConsumoTables";

import { FinanciamientoEmpresasSection } from "@/components/coeficientes/FinanciamientoEmpresasSection";

import { buildComercialDisplay } from "@/lib/coeficientes/coeficientesComercialDisplay";

import { generateCoeficientesComercialPdf } from "@/lib/coeficientes/generateCoeficientesComercialPdf";

import { Button } from "@/components/ui/button";



/** @typedef {import("@/lib/coeficientes/coeficientesComercialDisplay").ComercialCuotasFilter} ComercialCuotasFilter */



const FILTER_OPTIONS = [

  { id: "TODAS", label: "Todas" },

  { id: "CREDITO", label: "Crédito" },

  { id: "DEBITO", label: "Débito" },

  { id: "EMPRESAS", label: "Empresas" },

];



export function CoeficientesComercialPage() {

  const {

    vigentesRaw,

    globales,

    loading,

    error,

    cuotasComercialesVisibles,

    basePrice,

  } = useCoeficientesVigentes();

  const { consumoTarjetas: tarjetas, empresasTarjetas } = useCoeficientesTarjetas();

  const { financiaciones, loading: loadingEmpresas } = useCoeficientesEmpresas();



  const [cuotasFilter, setCuotasFilter] = useState(/** @type {ComercialCuotasFilter} */ ("TODAS"));

  const [exporting, setExporting] = useState(false);



  const display = useMemo(

    () =>

      buildComercialDisplay(

        vigentesRaw,

        cuotasComercialesVisibles,

        globales,

        tarjetas,

        basePrice

      ),

    [vigentesRaw, cuotasComercialesVisibles, globales, tarjetas, basePrice]

  );



  const showConsumo = cuotasFilter !== "EMPRESAS";

  const showEmpresas = cuotasFilter === "TODAS" || cuotasFilter === "EMPRESAS";



  const handleExportPdf = async () => {

    setExporting(true);

    try {

      await generateCoeficientesComercialPdf({
        vigentesRaw,
        globales,
        consumoTarjetas: tarjetas,
        empresasTarjetas,
        financiaciones,
        cuotasComercialesVisibles,
      });

    } catch (err) {

      console.error("[coeficientes] export PDF", err);

      alert("No se pudo generar el PDF. Intente nuevamente.");

    } finally {

      setExporting(false);

    }

  };



  if (loading) {

    return (

      <div className="flex items-center justify-center py-20 text-muted-foreground">

        <Loader2 className="w-6 h-6 animate-spin mr-2" />

        Cargando coeficientes…

      </div>

    );

  }



  return (

    <div className="space-y-8 text-foreground">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold">Coeficientes Comerciales Vigentes</h1>

          <p className="text-sm text-muted-foreground mt-1">

            Planilla comercial · tarjetas de consumo y financiamiento empresas

          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <Button

            type="button"

            variant="secondary"

            disabled={exporting}

            onClick={() => void handleExportPdf()}

            className="border-border"

          >

            {exporting ? (

              <Loader2 className="h-4 w-4 mr-2 animate-spin" />

            ) : (

              <FileDown className="h-4 w-4 mr-2" />

            )}

            Exportar PDF

          </Button>

          <Link

            href="/dashboard/ajustes/coeficientes/configuracion-general"

            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition px-3 py-2"

          >

            <Settings className="h-4 w-4" />

            Administrar

          </Link>

        </div>

      </div>



      {error && (

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">

          {error}

        </div>

      )}



      <div className="flex flex-wrap gap-2">

        {FILTER_OPTIONS.map((opt) => {

          const active = cuotasFilter === opt.id;

          return (

            <button

              key={opt.id}

              type="button"

              onClick={() => setCuotasFilter(/** @type {ComercialCuotasFilter} */ (opt.id))}

              className={`rounded-lg px-4 py-2 text-sm font-medium transition border ${

                active

                  ? "bg-red-500/15 text-red-300 border-red-500/30"

                  : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-zinc-600"

              }`}

            >

              {opt.label}

            </button>

          );

        })}

      </div>



      <div className="rounded-2xl border border-border bg-muted p-4 md:p-6 space-y-8">

        <div className="flex justify-between items-start border-b border-border pb-4">

          <div>

            <div className="text-sm text-muted-foreground">Grupo Núcleo S.A.</div>

            <div className="text-xs text-muted-foreground">Coeficientes comerciales vigentes</div>

          </div>

        </div>



        {showConsumo && (

          <ComercialConsumoTables display={display} cuotasFilter={cuotasFilter} />

        )}



        {showEmpresas && (

          <FinanciamientoEmpresasSection

            tarjetas={empresasTarjetas}

            financiaciones={financiaciones}

            loading={loadingEmpresas}

          />

        )}



        {!showConsumo && !showEmpresas && (

          <p className="text-sm text-muted-foreground text-center py-8">

            Seleccione un filtro para ver información.

          </p>

        )}

      </div>

    </div>

  );

}



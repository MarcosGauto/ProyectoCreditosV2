"use client";

import SectionHeader from "@/components/dashboard/SectionHeader";
import { Calculator } from "lucide-react";

import FinancingTable from "@/components/FinancingTable";

export default function FinancingPage() {
  return (
    <div>
      <SectionHeader
        title="Cálculo de Tasas"
        subtitle="Simulación y análisis financiero de tasas, financiación y proyecciones."
        breadcrumbs={["Dashboard", "Financiación"]}
      />

      <div
        className="
          rounded-3xl
          border
          border-border
          bg-card
          backdrop-blur-xl
          p-6
          md:p-8
          shadow-card
        "
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="
              flex
              items-center
              justify-center
              w-11
              h-11
              rounded-2xl
              bg-red-500/10
              border
              border-red-500/20
            "
          >
            <Calculator className="w-5 h-5 text-red-400" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Tabla de Financiación
            </h3>
            <p className="text-sm text-muted-foreground">
              Herramienta de cálculo y análisis de financiación.
            </p>
          </div>
        </div>

        <FinancingTable />
      </div>
    </div>
  );
}

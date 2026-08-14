"use client";

import SectionHeader from "@/components/dashboard/SectionHeader";

import { DollarSign } from "lucide-react";

import { ExchangeDifference } from "@/components/ExchageDifference";

export default function ExchangePage() {
  return (
    <div>
      {/* HEADER */}
      <SectionHeader
        title="Diferencia USD"
        subtitle="Cálculo y análisis de diferencias cambiarias y variaciones del dólar."
        breadcrumbs={[
          "Dashboard",
          "Diferencia USD",
        ]}
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
            <DollarSign className="w-5 h-5 text-red-400" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Análisis de Diferencia USD
            </h3>

            <p className="text-sm text-muted-foreground">
              Herramienta de cálculo financiero y comparación de valores.
            </p>
          </div>
        </div>

        <ExchangeDifference />
      </div>
    </div>
  );
}
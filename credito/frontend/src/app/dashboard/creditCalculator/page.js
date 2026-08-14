"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

import SectionHeader from "@/components/dashboard/SectionHeader";
import { CoeficientesComercialPage } from "@/components/coeficientes/CoeficientesComercialPage";

export default function CreditCalculatorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <SectionHeader
        title="Coeficientes"
        subtitle="Consulta comercial de coeficientes, cuotas y financiación."
        breadcrumbs={["Dashboard", "Coeficientes"]}
      />

      <div className="rounded-3xl border border-border bg-card backdrop-blur-xl p-6 md:p-8 shadow-card">
        <CoeficientesComercialPage />
      </div>
    </div>
  );
}

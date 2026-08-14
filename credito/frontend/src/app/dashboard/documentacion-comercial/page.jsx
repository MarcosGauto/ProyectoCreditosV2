"use client"

import { DocumentacionComercialPage } from "@/components/documentacionComercial/DocumentacionComercialPage"
import { useRequireAuth } from "@/hooks/useRequireAuth"

export default function DocumentacionComercialRoutePage() {
  const { user, loading: authLoading } = useRequireAuth()

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    )
  }

  return <DocumentacionComercialPage />
}

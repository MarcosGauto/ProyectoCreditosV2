"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import CalculoCuentaOrden from "@/components/CalculoCuentaOrden"
import { useAuth } from "@/app/context/AuthContext"

export default function CuentaOrdenPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <CalculoCuentaOrden />
}

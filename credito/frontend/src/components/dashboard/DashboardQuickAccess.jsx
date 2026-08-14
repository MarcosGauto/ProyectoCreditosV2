"use client"

import DashboardCard from "@/components/dashboard/Dashboard-card"
import { DASHBOARD_QUICK_ACCESS } from "@/lib/dashboard/dashboardConfig"

export function DashboardQuickAccess() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {DASHBOARD_QUICK_ACCESS.map((item) => (
        <DashboardCard
          key={item.id}
          title={item.title}
          description={item.description}
          icon={item.icon}
          href={item.href}
        />
      ))}
    </div>
  )
}

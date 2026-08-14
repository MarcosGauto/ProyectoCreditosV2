"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
}) {
  const isPositive = trend === "up";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/25 hover:shadow-[0_10px_28px_hsl(var(--primary)/0.10)]">
      <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {trend && trendValue ? (
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium ${
              isPositive
                ? "border-success/20 bg-success/10 text-success"
                : "border-danger/20 bg-danger/10 text-danger"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {trendValue}
          </div>
        ) : null}

        {description ? (
          <p className="ml-auto text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

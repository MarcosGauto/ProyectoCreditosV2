"use client";

import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
}) {
  return (
    <div className="mb-8">
      
      {/* BREADCRUMBS */}
      {breadcrumbs && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <div key={item} className="flex items-center gap-2">
              <span
                className={`
                  ${
                    index === breadcrumbs.length - 1
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                `}
              >
                {item}
              </span>

              {index !== breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        
        {/* LEFT */}
        <div>
          <h1
            className="
              text-3xl
              md:text-4xl
              font-bold
              tracking-tight
              text-foreground
            "
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className="
                mt-2
                text-sm
                md:text-base
                text-muted-foreground
                max-w-2xl
                leading-relaxed
              "
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* RIGHT ACTION */}
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div
        className="
          mt-6
          h-px
          w-full
          bg-gradient-to-r
          from-primary/20
          via-border
          to-transparent
        "
      />
    </div>
  );
}
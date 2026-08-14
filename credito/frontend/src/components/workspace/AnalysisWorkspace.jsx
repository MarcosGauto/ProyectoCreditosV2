"use client"

import { AnalysisHeader } from "@/components/workspace/AnalysisHeader"
import { AnalysisStatusBar } from "@/components/workspace/AnalysisStatusBar"
import { AnalysisContentLayout } from "@/components/workspace/AnalysisContentLayout"

/**
 * Shell visual del workspace. Sin lógica de negocio.
 *
 * @param {{
 *   header: import("react").ComponentProps<typeof AnalysisHeader>;
 *   status?: import("react").ComponentProps<typeof AnalysisStatusBar> | null;
 *   summary?: import("react").ReactNode;
 *   sidebar: import("react").ReactNode;
 *   actions?: import("react").ReactNode;
 *   children: import("react").ReactNode;
 *   readOnly?: boolean;
 *   readOnlyTitle?: string;
 * }} props
 */
export function AnalysisWorkspace({
  header,
  status = null,
  summary = null,
  sidebar,
  actions = null,
  children,
  readOnly = false,
  readOnlyTitle = "Resultado del Análisis",
}) {
  return (
    <div className="rounded-2xl border border-border/90 bg-background shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
      {!readOnly ? (
        <AnalysisHeader {...header} />
      ) : (
        <div className="border-b border-border/80 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{readOnlyTitle}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Vista de solo lectura</p>
        </div>
      )}

      {!readOnly && status && <AnalysisStatusBar {...status} />}

      {summary && (
        <div className="border-b border-border/70 px-3 py-2.5 sm:px-4 lg:px-5">
          {summary}
        </div>
      )}

      <AnalysisContentLayout sidebar={sidebar} actions={actions}>
        {children}
      </AnalysisContentLayout>
    </div>
  )
}

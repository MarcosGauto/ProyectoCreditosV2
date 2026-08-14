"use client"

/**
 * Layout: pestañas horizontales sticky + contenido.
 *
 * @param {{
 *   sidebar: import("react").ReactNode;
 *   actions?: import("react").ReactNode;
 *   children: import("react").ReactNode;
 * }} props
 */
export function AnalysisContentLayout({ sidebar, actions = null, children }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="sticky top-[3.25rem] z-20 border-b border-border/80 bg-background/95 px-2 backdrop-blur-xl sm:top-12 sm:px-4 lg:px-5">
        {sidebar}
      </div>

      <div
        className={`grid min-w-0 gap-0 ${
          actions ? "xl:grid-cols-[minmax(0,1fr)_200px]" : ""
        }`}
      >
        <div className="min-w-0 space-y-3 overflow-x-auto p-3 sm:space-y-4 sm:p-4 lg:p-5">
          {children}
        </div>

        {actions && (
          <div className="border-t border-border/70 p-3 lg:border-border/70 xl:border-t-0 xl:border-l xl:p-3.5">
            <div className="xl:sticky xl:top-[6.5rem]">{actions}</div>
          </div>
        )}
      </div>
    </div>
  )
}

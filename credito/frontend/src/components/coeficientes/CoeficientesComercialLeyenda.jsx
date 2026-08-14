import {
  COEFICIENTES_COMERCIAL_LEYENDA_ITEMS,
  formatLeyendaBulletsInline,
} from "@/lib/coeficientes/coeficientesComercialLeyenda";

export function CoeficientesComercialLeyenda() {
  return (
    <aside className="mt-5 pt-4 border-t border-border/80">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-0 md:divide-x md:divide-zinc-800">
        {COEFICIENTES_COMERCIAL_LEYENDA_ITEMS.map((item) => (
          <div
            key={item.title}
            className="md:px-4 first:md:pl-0 last:md:pr-0 text-[11px] text-muted-foreground leading-snug text-left"
          >
            <p className="font-semibold text-muted-foreground text-xs mb-1.5 tracking-wide">
              {item.title}
            </p>
            <p>{item.body}</p>
            {item.bullets?.length ? (
              <p className="mt-1.5 text-muted-foreground/90">
                {formatLeyendaBulletsInline(item.bullets)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

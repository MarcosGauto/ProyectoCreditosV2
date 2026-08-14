"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

/**
 * @param {{
 *   fotos: import("@/lib/sucursalesModel").SucursalFoto[];
 *   sucursalNombre: string;
 *   onPhotoClick?: (index: number) => void;
 *   className?: string;
 * }} props
 */
export function SucursalPhotoCarousel({
  fotos,
  sucursalNombre,
  onPhotoClick,
  className = "",
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: fotos.length > 1,
    align: "start",
  })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return
    }
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) {
      return
    }
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, fotos.length])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  if (fotos.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted text-center px-6 py-10 max-h-[220px] md:max-h-[320px] xl:max-h-[420px] ${className}`}
      >
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Sin imágenes cargadas</p>
        <p className="text-xs text-muted-foreground mt-1">
          Usá &quot;Agregar fotos&quot; para subir imágenes del local
        </p>
      </div>
    )
  }

  return (
    <div className={`relative group ${className}`}>
      <div className="overflow-hidden rounded-xl border border-border" ref={emblaRef}>
        <div className="flex">
          {fotos.map((foto, index) => (
            <div
              key={foto.id}
              className="min-w-0 flex-[0_0_100%] relative"
            >
              <button
                type="button"
                className="w-full block text-left"
                onClick={() => onPhotoClick?.(index)}
              >
                <div className="relative h-[220px] md:h-[280px] xl:h-[380px] w-full">
                  <img
                    src={foto.url}
                    alt={`${sucursalNombre} — ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground drop-shadow">
                      {sucursalNombre}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/60 border border-border text-foreground flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background/80"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/60 border border-border text-foreground flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background/80"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex justify-center gap-1.5 mt-3">
            {fotos.map((foto, index) => (
              <button
                key={foto.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === selectedIndex
                    ? "w-6 bg-red-500"
                    : "w-1.5 bg-slate-600 hover:bg-slate-400"
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

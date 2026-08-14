"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar } from "lucide-react"

export function Declarations() {
    const declaraciones = [
        {
            id: "balance",
            titulo: "Balance",
            ultimaFecha: "15 de Marzo, 2024",
            descripcion: "Balance General del ejercicio fiscal",
        },
        {
            id: "iva",
            titulo: "Declaración de IVA",
            ultimaFecha: "28 de Febrero, 2024",
            descripcion: "Declaración mensual del Impuesto al Valor Agregado",
        },
        {
            id: "iibb",
            titulo: "Declaración de IIBB",
            ultimaFecha: "20 de Febrero, 2024",
            descripcion: "Declaración de Ingresos Brutos",
        },
    ]

    return (
        <div className="w-full rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
                {declaraciones.map((declaracion) => (
                    <AccordionItem
                        key={declaracion.id}
                        value={declaracion.id}
                        className="border-b border-border last:border-b-0"
                    >
                        <AccordionTrigger className="px-5 py-4 text-left hover:bg-accent/40">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-semibold text-sm text-foreground">{declaracion.titulo}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-4">
                            <div className="rounded-xl bg-muted border border-border p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Última fecha:</span>
                                    <span className="text-xs font-semibold text-foreground">{declaracion.ultimaFecha}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{declaracion.descripcion}</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}

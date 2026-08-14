"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

export function IndicatorsSummary({ ventasContables, ventasIIBB, ventasIVA, promedio, patrimonio }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen de Indicadores</CardTitle>
                <CardDescription>Información consolidada de ventas y patrimonio</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Ventas Contables</p>
                        <p className="text-lg font-semibold">{formatCurrency(ventasContables)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Ventas IIBB</p>
                        <p className="text-lg font-semibold">{formatCurrency(ventasIIBB)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Ventas IVA</p>
                        <p className="text-lg font-semibold">{formatCurrency(ventasIVA)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Promedio</p>
                        <p className="text-lg font-semibold">{formatCurrency(promedio)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Patrimonio</p>
                        <p className="text-lg font-semibold">{formatCurrency(patrimonio)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


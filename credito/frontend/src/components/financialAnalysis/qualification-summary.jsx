"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function QualificationSummary({ preCalificacion, calificacionFinal, condicionVenta, montoMaximo }) {
    return (
        <Card className="bg-primary/5">
            <CardHeader>
                <CardTitle>Calificación Crediticia</CardTitle>
                <CardDescription>Resultado del análisis crediticio</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Pre-Calificación</p>
                            <input className="text-2xl font-bold text-primary"></input>
                            </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Calificación Final</p>
                            <input className="text-2xl font-bold text-primary border" placeholder="Monto aprobado"></input>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Condición de Venta</p>
                        <p className="text-lg font-semibold">{condicionVenta}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


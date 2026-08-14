"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import FileUpload from "@/components/File-upload"

export function BalanceTable({ form }) {
    const [balancePdf, setBalancePdf] = useState(null)

    return (
        <div className="p-4 space-y-8">
            <h2 className="text-2xl font-bold text-center mb-6">INFORMACION CONTABLE</h2>

            {/* Balance Sheet Section */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-[400px] border">EJERCICIO CERRADO</TableHead>
                            <TableHead className="text-center border">2023</TableHead>
                            <TableHead className="text-center border">2022</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium border">ACTIVO CORRIENTE</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">ACTIVO NO CORRIENTE</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">TOTAL ACTIVO</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">DISPONIBILIDADES</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">CREDITOS POR VENTAS</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">INVENTARIOS</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">CUENTAS PARTICULARES SOCIOS</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">PASIVO CORRIENTE</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">PASIVO NO CORRIENTE</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">TOTAL PASIVO</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">DEUDAS COMERCIALES</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">PATRIMONIO NETO</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="pl-8 border">CAPITAL SUSCRIPTO</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                            <TableCell className="text-right border">-</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Sales Section */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-[200px] border">Vtas cbles</TableHead>
                            <TableHead className="border">Vtas actualiz.</TableHead>
                            <TableHead className="border">Calculo credito</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium border">2023</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">2022</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Purchases Section */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-[200px] border">Compras</TableHead>
                            <TableHead className="border">Vtas actualiz.</TableHead>
                            <TableHead className="border">Calculo credito</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium border">2023</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Costs Section */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-[200px] border">Costos</TableHead>
                            <TableHead className="border">Vtas actualiz.</TableHead>
                            <TableHead className="border">Calculo credito</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium border">2023</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium border">2022</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                            <TableCell className="text-right border">$ -</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <div className="mt-6">
                <FileUpload label="Adjuntar Balance (PDF)" onFileSelect={(file) => setBalancePdf(file)} />
            </div>
        </div>
    )
}


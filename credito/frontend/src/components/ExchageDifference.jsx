'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowRight, TrendingDown, TrendingUp, DollarSign, Search, AlertCircle, Plus } from 'lucide-react'

const inputClass =
  "bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-red-500/40"
const labelClass = "text-muted-foreground"
const cardClass = "rounded-2xl border border-border bg-muted text-foreground shadow-none"
const dialogClass = "bg-card border-border text-foreground max-w-2xl"
const tableWrapClass = "rounded-xl border border-border overflow-hidden"
const tableHeadClass =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-card"
const mutedClass = "text-muted-foreground"

function calculateDifference(order) {
  if (!order.exchangeRateInvoice) return null

  // Calcular USD dividiendo el monto en pesos entre el tipo de cambio
  const usdAtOrder = order.amountPesos / order.exchangeRateOrder
  const usdAtInvoice = order.amountPesos / order.exchangeRateInvoice

  // La diferencia en USD
  const differenceUSD = usdAtOrder - usdAtInvoice

  // ND a generar: diferencia en USD multiplicada por el TC de factura
  const ndToGenerate = differenceUSD * order.exchangeRateInvoice

  const differencePercentage = ((order.exchangeRateInvoice - order.exchangeRateOrder) / order.exchangeRateOrder) * 100

  return {
    usdAtOrder,
    usdAtInvoice,
    differenceUSD,
    ndToGenerate,
    differencePercentage,
    type: differenceUSD > 0 ? 'gain' : differenceUSD < 0 ? 'loss' : 'neutral'
  }
}

export function ExchangeDifference() {
  const [orders, setOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDifferences = orders
    .filter(o => o.status === 'invoiced')
    .reduce((acc, order) => {
      const diff = calculateDifference(order)
      return acc + (diff?.ndToGenerate || 0)
    }, 0)

  const handleAddOrder = (newOrder) => {
    const order = {
      ...newOrder,
      id: Date.now().toString()
    }
    setOrders(prev => [...prev, order])
    setIsAddDialogOpen(false)
  }

  const handleUpdateInvoice = (orderId, invoiceData) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { ...order, ...invoiceData, status: 'invoiced' }
        : order
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className={dialogClass}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Agregar Nuevo Pedido</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ingresa los datos del pedido y su tipo de cambio
              </DialogDescription>
            </DialogHeader>
            <AddOrderForm onSubmit={handleAddOrder} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total ND a Generar</CardTitle>
            <DollarSign className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400 tabular-nums">
              ${totalDifferences.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${mutedClass} mt-1`}>
              {totalDifferences >= 0 ? 'Total acumulado' : 'Pérdida acumulada'}
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Facturados</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {orders.filter(o => o.status === 'invoiced').length}
            </div>
            <p className={`text-xs ${mutedClass} mt-1`}>
              De {orders.length} totales
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <p className={`text-xs ${mutedClass} mt-1`}>
              Esperando facturación
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Main Table Card */}
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">Pedidos y Facturas</CardTitle>
              <CardDescription className="text-muted-foreground">Consulta las diferencias de tipo de cambio por pedido</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar pedido o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`max-w-sm ${inputClass}`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className={`py-12 text-center ${mutedClass} border border-border rounded-xl bg-card/50`}>
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">No hay pedidos registrados</p>
              <p className="text-sm mt-2">Comienza agregando tu primer pedido usando el botón &quot;Agregar Pedido&quot;</p>
            </div>
          ) : (
            <div className={tableWrapClass}>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className={tableHeadClass}>Pedido</TableHead>
                    <TableHead className={tableHeadClass}>Cliente</TableHead>
                    <TableHead className={tableHeadClass}>Monto (Pesos)</TableHead>
                    <TableHead className={tableHeadClass}>T.C. Pedido</TableHead>
                    <TableHead className={tableHeadClass}>T.C. Factura</TableHead>
                    <TableHead className={tableHeadClass}>ND a Generar</TableHead>
                    <TableHead className={tableHeadClass}>Estado</TableHead>
                    <TableHead className={tableHeadClass}>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const diff = calculateDifference(order)
                    return (
                      <TableRow key={order.id} className="border-border hover:bg-card/50">
                        <TableCell className="font-medium text-foreground">{order.orderNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{order.client}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">${order.amountPesos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">USD {order.exchangeRateOrder.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {order.exchangeRateInvoice ? `USD ${order.exchangeRateInvoice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {diff ? (
                            <div className="flex items-center gap-1">
                              {diff.type === 'gain' ? (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                              ) : diff.type === 'loss' ? (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                              ) : null}
                              <span className={`tabular-nums ${diff.type === 'gain' ? 'text-green-400' : diff.type === 'loss' ? 'text-red-400' : 'text-muted-foreground'}`}>
                                ${Math.abs(diff.ndToGenerate).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              order.status === 'invoiced'
                                ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/10'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10'
                            }
                          >
                            {order.status === 'invoiced' ? 'Facturado' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.status === 'pending' ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                  Facturar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={dialogClass}>
                                <DialogHeader>
                                  <DialogTitle className="text-foreground">Registrar Factura</DialogTitle>
                                  <DialogDescription className="text-muted-foreground">
                                    Ingresa los datos de facturación para {order.orderNumber}
                                  </DialogDescription>
                                </DialogHeader>
                                <InvoiceForm order={order} onSubmit={(data) => handleUpdateInvoice(order.id, data)} />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  Ver detalle
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={dialogClass}>
                                <DialogHeader>
                                  <DialogTitle className="text-foreground">Detalle de Diferencia - {order.orderNumber}</DialogTitle>
                                  <DialogDescription className="text-muted-foreground">
                                    Análisis completo del tipo de cambio
                                  </DialogDescription>
                                </DialogHeader>
                                <OrderDetailView order={order} />
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-start print:hidden">
        <Button
          asChild
          variant="secondary"
          className="border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Link href="/dashboard">← Volver al dashboard</Link>
        </Button>
      </div>
    </div>

  )
}

function AddOrderForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    orderNumber: '',
    client: '',
    amountPesos: '',
    exchangeRateOrder: '',
    orderDate: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    onSubmit({
      orderNumber: formData.orderNumber,
      client: formData.client,
      amountPesos: parseFloat(formData.amountPesos),
      exchangeRateOrder: parseFloat(formData.exchangeRateOrder),
      orderDate: formData.orderDate,
      invoiceDate: null,
      exchangeRateInvoice: null,
      status: 'pending'
    })

    // Reset form
    setFormData({
      orderNumber: '',
      client: '',
      amountPesos: '',
      exchangeRateOrder: '',
      orderDate: new Date().toISOString().split('T')[0]
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber" className={labelClass}>Número de Pedido</Label>
          <Input
            id="orderNumber"
            placeholder="Fc A 00098-00009227"
            value={formData.orderNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orderDate" className={labelClass}>Fecha del Pedido</Label>
          <Input
            id="orderDate"
            type="date"
            value={formData.orderDate}
            onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client" className={labelClass}>Cliente / Comprobante</Label>
        <Input
          id="client"
          placeholder="Nombre del cliente o tipo de comprobante"
          value={formData.client}
          onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amountPesos" className={labelClass}>Monto en Pesos</Label>
          <Input
            id="amountPesos"
            type="number"
            step="0.01"
            placeholder="2805921.10"
            value={formData.amountPesos}
            onChange={(e) => setFormData(prev => ({ ...prev, amountPesos: e.target.value }))}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchangeRateOrder" className={labelClass}>Tipo de Cambio Pedido (USD)</Label>
          <Input
            id="exchangeRateOrder"
            type="number"
            step="0.01"
            placeholder="1330.00"
            value={formData.exchangeRateOrder}
            onChange={(e) => setFormData(prev => ({ ...prev, exchangeRateOrder: e.target.value }))}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" variant="primary">Agregar Pedido</Button>
      </div>
    </form>
  )
}

function InvoiceForm({ order, onSubmit }) {
  const [formData, setFormData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    exchangeRateInvoice: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    onSubmit({
      invoiceDate: formData.invoiceDate,
      exchangeRateInvoice: parseFloat(formData.exchangeRateInvoice)
    })
  }


  const calculatedUSD = formData.exchangeRateInvoice ?
    (order.amountPesos / parseFloat(formData.exchangeRateInvoice)).toFixed(2) : '0.00'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted border border-border rounded-xl space-y-2">
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>Pedido:</span>
          <span className="font-medium text-foreground">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>Cliente:</span>
          <span className="font-medium text-foreground">{order.client}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>Monto (Pesos):</span>
          <span className="font-medium text-foreground tabular-nums">${order.amountPesos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>T.C. Original:</span>
          <span className="font-medium text-foreground tabular-nums">USD {order.exchangeRateOrder.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>USD al pedido:</span>
          <span className="font-medium text-red-400 tabular-nums">USD {(order.amountPesos / order.exchangeRateOrder).toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceDate" className={labelClass}>Fecha de Facturación</Label>
        <Input
          id="invoiceDate"
          type="date"
          value={formData.invoiceDate}
          onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exchangeRateInvoice" className={labelClass}>Tipo de Cambio de Factura (USD)</Label>
        <Input
          id="exchangeRateInvoice"
          type="number"
          step="0.01"
          placeholder="1460.00"
          value={formData.exchangeRateInvoice}
          onChange={(e) => setFormData(prev => ({ ...prev, exchangeRateInvoice: e.target.value }))}
          required
          className={inputClass}
        />
        {formData.exchangeRateInvoice && (
          <p className={`text-sm ${mutedClass}`}>
            Cantidad en USD: <span className="text-red-400 tabular-nums">${calculatedUSD}</span>
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" variant="primary">Registrar Factura</Button>
      </div>
    </form>
  )
}

function OrderDetailView({ order }) {
  const diff = calculateDifference(order)

  if (!diff) {
    return (
      <div className={`py-8 text-center ${mutedClass}`}>
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">Este pedido aún no ha sido facturado</p>
        <p className="text-sm mt-2">La diferencia de tipo de cambio se calculará al momento de la facturación</p>
      </div>
    )
  }

  const innerCardClass = "rounded-xl border border-border bg-muted shadow-none"

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted border border-border rounded-xl">
        <div>
          <Label className={`text-xs ${mutedClass}`}>Cliente</Label>
          <p className="font-medium text-foreground">{order.client}</p>
        </div>
        <div>
          <Label className={`text-xs ${mutedClass}`}>Número de Pedido</Label>
          <p className="font-medium text-foreground">{order.orderNumber}</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card/50">
        <div className="text-center">
          <Label className={`text-xs ${mutedClass}`}>Fecha Pedido</Label>
          <p className="font-medium text-foreground">{new Date(order.orderDate).toLocaleDateString('es-MX')}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <Label className={`text-xs ${mutedClass}`}>Fecha Factura</Label>
          <p className="font-medium text-foreground">{order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('es-MX') : '-'}</p>
        </div>
        <div className="text-center">
          <Label className={`text-xs ${mutedClass}`}>Días transcurridos</Label>
          <p className="font-medium text-foreground">
            {order.invoiceDate
              ? Math.floor((new Date(order.invoiceDate).getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))
              : '-'
            } días
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-red-400">Cálculo de Diferencias</h4>

        <div className="grid gap-4">
          <Card className={innerCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Al momento del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={mutedClass}>Monto (Pesos):</span>
                <span className="font-medium text-foreground tabular-nums">${order.amountPesos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className={mutedClass}>Tipo de Cambio:</span>
                <span className="font-medium text-foreground tabular-nums">USD {order.exchangeRateOrder.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className={mutedClass}>Fórmula:</span>
                <span className="font-mono text-xs text-muted-foreground">${order.amountPesos.toLocaleString()} ÷ {order.exchangeRateOrder}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-medium text-muted-foreground">Cantidad en USD:</span>
                <span className="font-bold text-red-400 tabular-nums">USD {diff.usdAtOrder.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={innerCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Al momento de Facturación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={mutedClass}>Monto (Pesos):</span>
                <span className="font-medium text-foreground tabular-nums">${order.amountPesos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className={mutedClass}>Tipo de Cambio:</span>
                <span className="font-medium text-foreground tabular-nums">USD {order.exchangeRateInvoice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className={mutedClass}>Fórmula:</span>
                <span className="font-mono text-xs text-muted-foreground">${order.amountPesos.toLocaleString()} ÷ {order.exchangeRateInvoice}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-medium text-muted-foreground">Cantidad en USD:</span>
                <span className="font-bold text-red-400 tabular-nums">USD {diff.usdAtInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-red-500/30 bg-red-500/5 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-300">Diferencia en USD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={mutedClass}>USD al pedido:</span>
                <span className="font-medium text-foreground tabular-nums">USD {diff.usdAtOrder.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className={mutedClass}>USD al facturar:</span>
                <span className="font-medium text-foreground tabular-nums">USD {diff.usdAtInvoice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-red-500/30">
                <span className="font-medium text-muted-foreground">Diferencia USD:</span>
                <span className="font-bold text-red-400 tabular-nums">USD {Math.abs(diff.differenceUSD).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card
          className={`shadow-none ${
            diff.type === 'gain'
              ? 'border-green-500/30 bg-green-500/10'
              : diff.type === 'loss'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-border bg-muted'
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {diff.type === 'gain' ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
                <div>
                  <p className={`text-sm ${mutedClass}`}>ND a Generar</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    USD {Math.abs(diff.differenceUSD).toFixed(2)} × {order.exchangeRateInvoice}
                  </p>
                  <p className={`text-2xl font-bold mt-1 tabular-nums ${diff.type === 'gain' ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(diff.ndToGenerate).toLocaleString('es-MX', { minimumFractionDigits: 2 })} Pesos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm ${mutedClass}`}>Variación T.C.</p>
                <p className={`text-xl font-bold tabular-nums ${diff.differencePercentage > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {diff.differencePercentage > 0 ? '+' : ''}{diff.differencePercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

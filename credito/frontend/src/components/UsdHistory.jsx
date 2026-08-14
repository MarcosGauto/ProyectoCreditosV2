"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UsdHistory() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [datos, setDatos] = useState([]);
  const [usdHoy, setUsdHoy] = useState(null);
  const [mensaje, setMensaje] = useState("");

  // 🔹 Al entrar a la página, trae y guarda el USD actual
  useEffect(() => {
    const obtenerUsdHoy = async () => {
      try {
        const res = await fetch("http://localhost:5000/usd");
        if (!res.ok) throw new Error("Error al obtener USD actual");
        const data = await res.json();

        setUsdHoy({
          fecha: new Date().toLocaleDateString("es-AR"),
          venta: data.venta ?? "N/A",
        });

        if (data.guardado) {
          console.log("✅ Registro guardado en Firestore.");
        } else {
          console.log("ℹ Registro ya existía, no se guardó.");
        }
      } catch (err) {
        console.error("Error:", err);
        setMensaje("Error al obtener la cotización actual.");
      }
    };
    obtenerUsdHoy();
  }, []);

  // 🔍 Buscar histórico
 const buscarHistorico = async () => {
  try {
    if (!fechaSeleccionada) {
      setMensaje("Seleccioná una fecha para buscar.");
      return;
    }

    const fechaFormateada = fechaSeleccionada.split("-").reverse().join("-");
    console.log("Buscando en Firestore:", fechaFormateada);

    const res = await fetch(`http://localhost:5000/usd/historial?fecha=${fechaSeleccionada}`);

    // 👇 AGREGAMOS ESTO para ver qué devuelve el backend
    const text = await res.text();
    console.log("🔎 Respuesta cruda del backend:", text);

    if (!res.ok) throw new Error("Error al buscar histórico");

    const data = JSON.parse(text);

    if (data.message) {
      setDatos([]);
      setMensaje("No se encontraron registros para esa fecha.");
    } else {
      setDatos(data);
      setMensaje("");
    }
  } catch (err) {
    console.error("Error:", err);
    setMensaje("Error al buscar histórico.");
  }
};

return (
  <div className="flex justify-center pt-16 pb-10 bg-background min-h-screen text-foreground">
    <Card className="p-6 shadow-2xl w-full max-w-4xl bg-card border border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-red-500">
          Histórico USD Oficial
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* USD HOY */}
        {usdHoy && (
          <div className="bg-green-950/30 border border-green-700 rounded-xl p-4 text-center mb-6">
            <h3 className="font-semibold text-green-400">
              Dólar oficial de hoy ({usdHoy.fecha})
            </h3>

            <p className="text-green-200 mt-1 text-lg">
              <strong>Venta:</strong> {usdHoy.venta}
            </p>
          </div>
        )}

        {/* BUSCADOR */}
        <div className="w-full flex justify-center mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 p-4 border border-border rounded-2xl bg-muted shadow-lg w-full max-w-md">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Fecha anterior:
            </label>

            <Input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="
                w-full sm:w-auto
                bg-background
                border-border
                text-foreground
                focus:border-red-500
                focus:ring-red-500
              "
            />

            <Button
              onClick={buscarHistorico}
              className="
                bg-red-600
                hover:bg-red-700
                text-foreground
                rounded-xl
              "
            >
              Buscar
            </Button>
          </div>
        </div>

        {/* MENSAJES */}
        {mensaje && (
          <p className="text-center text-sm text-muted-foreground mb-4">
            {mensaje}
          </p>
        )}

        {/* TABLA */}
        {datos.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-center overflow-hidden">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="border border-border p-3">Fecha</th>
                  <th className="border border-border p-3">
                    Dólar GBP
                  </th>
                </tr>
              </thead>

              <tbody>
                {datos.map((item, index) => (
                  <tr
                    key={index}
                    className="bg-card hover:bg-muted transition"
                  >
                    <td className="border border-border p-3 text-foreground/80">
                      {item.fecha}
                    </td>

                    <td className="border border-border p-3 text-foreground font-medium">
                      {item.precioDolar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BOTON ATRAS */}
        <div className="flex justify-start mt-6">
          <Button
            asChild
            variant="secondary"
            className="
              rounded-full
              px-4
              py-1
              text-sm
              border-border
              bg-muted
              text-foreground/80
              hover:bg-accent
              hover:text-foreground
            "
          >
            <Link href="/">← Atrás</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)
}

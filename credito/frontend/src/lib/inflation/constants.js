/**
 * Campos del balance que se actualizan por IPC acumulado.
 * @type {Array<{
 *   historical: string;
 *   actualizado: string;
 *   label: string;
 * }>}
 */
export const BALANCE_INFLATION_FIELDS = [
  {
    historical: "ventas",
    actualizado: "ventasActualizada",
    label: "Ventas contables",
  },
  {
    historical: "compras",
    actualizado: "comprasActualizada",
    label: "Compras",
  },
  {
    historical: "costos",
    actualizado: "costosActualizada",
    label: "Costos",
  },
]

/** Colección Firestore prevista para IPC mensual (implementación futura). */
export const FIRESTORE_IPC_COLLECTION = "ipc_mensual"

/** Serie IPC INDEC en datos.gob.ar (reexportada desde datosGobArSeries). */
export { IPC_SERIES_ID } from "@/lib/inflation/datosGobArSeries"

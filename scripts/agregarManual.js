// scripts/agregarManual.js
import { db } from "../firebase.js";

// 🔧 Datos a cargar manualmente
const fecha = "10-10-2025";
const hora = "15:30:00";
const precioDolar = 1450;
const fuente = "Manual";

async function agregarManual() {
  try {
    await db.collection("historialUsd").add({
      fecha,
      hora,
      precioDolar,
      fuente,
      timestamp: new Date(),
    });
    console.log(`✅ Agregado ${fecha} ${hora} → ${precioDolar}`);
  } catch (error) {
    console.error("❌ Error al agregar:", error);
  }
}

agregarManual();

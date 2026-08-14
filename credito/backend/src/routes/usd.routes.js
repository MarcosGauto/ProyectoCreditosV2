import express from "express";
import axios from "axios";
import admin from "firebase-admin";

const router = express.Router();

// ✅ Inicializar Firebase solo una vez
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const COLLECTION = "historialUsd"; // ✅ usamos un único nombre de colección


// 📈 Obtener USD actual desde Ámbito y guardar si no existe el día
router.get("/", async (req, res) => {
  try {
    const response = await axios.get(
      "https://mercados.ambito.com/dolarnacion/variacion",
      { timeout: 15_000 }
    );

    const data = response.data;
    console.log("✅ Datos obtenidos desde Ámbito:", data);

    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString("es-AR").replace(/\//g, "-"); // dd-mm-yyyy
    const horario = ahora.toLocaleTimeString("es-AR");

    // 🔍 Verificar si ya existe un registro para esa fecha
    const existente = await db
      .collection(COLLECTION)
      .where("fecha", "==", fechaFormateada)
      .limit(1)
      .get();

    if (!existente.empty) {
      console.log(`⚠ Ya existe un registro para ${fechaFormateada}, no se duplica.`);
      return res.json({ ...data, guardado: false, mensaje: `Ya existe registro del ${fechaFormateada}` });
    }

    const registro = {
      fecha: fechaFormateada,
      horario,
      compra: data?.compra ?? "N/A",
      venta: data?.venta ?? "N/A",
      fuente: "Ámbito",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION).add(registro);
    console.log(`💾 Guardado en Firestore -> ${fechaFormateada} ${horario} - ${registro.venta}`);

    res.json({ ...data, guardado: true });
  } catch (error) {
    console.error("❌ Error en /usd:", error);
    res.status(500).json({ error: error.message });
  }
});


// 🕓 Consultar histórico por fecha (YYYY-MM-DD o DD-MM-YYYY)
// 🕓 Consultar histórico por fecha (YYYY-MM-DD o DD-MM-YYYY)
router.get("/historial", async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      console.log("⚠ Falta parámetro 'fecha'");
      return res.status(400).json({ message: "Falta el parámetro fecha" });
    }

    const [anio, mes, dia] = fecha.split("-");
    const fechaYMD = `${anio}-${mes}-${dia}`;
    const fechaDMY = `${dia}-${mes}-${anio}`;

    console.log("🕓 Consultando Firestore por:", fecha, "|", fechaYMD, "|", fechaDMY);

    const snapshot = await db
      .collection(COLLECTION)
      .where("fecha", "in", [fechaYMD, fechaDMY])
      .get();

    console.log(`📄 Documentos encontrados: ${snapshot.size}`);

    if (snapshot.empty) {
      console.log("⚠ No se encontraron registros para", fecha);
      return res.status(404).json({ message: "No hay registros para esa fecha" });
    }

    const resultados = snapshot.docs.map((doc) => {
      const d = doc.data();
      const valorNumerico = parseFloat(
        (d.precioDolar ?? d.venta ?? d.compra ?? 0).toString().replace(",", ".")
      );

      return {
        id: doc.id,
        fecha: d.fecha,
        horario: d.horario ?? "",
        precioDolar: valorNumerico,
        fuente: d.fuente ?? "Manual",
      };
    });

    console.log("✅ Resultados:", resultados.length);
    res.status(200).json(resultados);

  } catch (error) {
    console.error("❌ Error en /historial:", error);
    res.status(500).json({ error: error.message });
  }
});


export default router;

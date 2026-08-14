import express from "express";
import cors from "cors";
import "./admin.js";
import apiRouter from "./routes/index.js";
import dns from 'node:dns';

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
dns.setDefaultResultOrder('ipv4first');


// TODAS las rutas pasan por /api
app.use("/api", apiRouter);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en http://localhost:${PORT}`);
});

import { Router } from "express";
import  {generateQualificationPDF}  from "../services/pdf.service.js";

const router = Router();

router.post("/generate", async (req, res) => {
  try {
    const pdfPath = await generateQualificationPDF(req.body);

    return res.download(pdfPath, (err) => {
      if (err) console.error("Error al enviar PDF:", err);
    });
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ error: "Error al generar PDF" });
  }
});

export default router;

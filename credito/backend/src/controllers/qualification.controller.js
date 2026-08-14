import * as qualificationService from "../services/qualification.service.js"

export async function calculateQualification(req, res) {
  try {
    const { cuit } = req.params
    const data = await qualificationService.buildQualification(cuit)
    return res.json({ ok: true, data })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export async function getQualification(req, res) {
  try {
    const { cuit } = req.params
    const doc = await qualificationService.getQualification(cuit)
    if (!doc) return res.status(404).json({ ok: false, error: "No existe" })
    return res.json({ ok: true, data: doc })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

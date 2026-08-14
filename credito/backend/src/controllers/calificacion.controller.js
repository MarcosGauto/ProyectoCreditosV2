import {
  serviceGetQualificationByCuit,
  serviceSaveQualification,
  serviceDeleteQualification
} from "../services/qualification.service.js";

export async function getQualification(req, res) {
  try {
    const { cuit } = req.params;
    const data = await serviceGetQualificationByCuit(cuit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createQualification(req, res) {
  try {
    const saved = await serviceSaveQualification(req.body);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function removeQualification(req, res) {
  try {
    const { id } = req.params;
    await serviceDeleteQualification(id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

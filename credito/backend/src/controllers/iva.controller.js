import { createIVA, fetchIVA, removeIVA } from "../services/iva.service.js";

export async function handleCreateIVA(req, res) {
  try {
    const data = req.body;
    const result = await createIVA(data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleGetIVA(req, res) {
  try {
    const { cuit } = req.params;
    const data = await fetchIVA(cuit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleDeleteIVA(req, res) {
  try {
    const { id } = req.params;
    const result = await removeIVA(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

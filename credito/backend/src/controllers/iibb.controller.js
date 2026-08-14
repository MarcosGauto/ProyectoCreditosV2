import { createIIBB, fetchIIBB, removeIIBB } from "../services/iibb.service.js";

export async function handleCreateIIBB(req, res) {
  try {
    const data = req.body;
    const result = await createIIBB(data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleGetIIBB(req, res) {
  try {
    const { cuit } = req.params;
    const data = await fetchIIBB(cuit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleDeleteIIBB(req, res) {
  try {
    const { id } = req.params;
    const result = await removeIIBB(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

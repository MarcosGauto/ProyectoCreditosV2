import * as clientService from "../services/client.service.js";

const CLIENT_NOT_FOUND = { error: "Client not found" };
const INTERNAL_ERROR = { error: "Internal server error" };

export async function getClient(req, res) {
  try {
    const cuit = req.params.cuit;
    const client = await clientService.getByCuit(cuit);
    if (client === null) {
      return res.status(404).json(CLIENT_NOT_FOUND);
    }
    res.json(client);
  } catch (err) {
    res.status(500).json(INTERNAL_ERROR);
  }
}

export async function updateClientCtrl(req, res) {
  try {
    const cuit = req.params.cuit;
    const updated = await clientService.update(cuit, req.body);
    if (updated === null) {
      return res.status(404).json(CLIENT_NOT_FOUND);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json(INTERNAL_ERROR);
  }
}

export async function deleteClientCtrl(req, res) {
  try {
    const cuit = req.params.cuit;
    const deleted = await clientService.remove(cuit);
    if (deleted === null) {
      return res.status(404).json(CLIENT_NOT_FOUND);
    }
    res.json(deleted);
  } catch (err) {
    res.status(500).json(INTERNAL_ERROR);
  }
}

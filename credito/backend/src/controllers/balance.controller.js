import * as balanceService from "../services/balance.service.js";

export async function createBalance(req, res) {
  try {
    const result = await balanceService.save(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getBalanceByCuit(req, res) {
  try {
    const result = await balanceService.getByCuit(req.params.cuit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

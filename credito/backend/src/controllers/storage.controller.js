import * as storageService from "../services/storage.service.js";


export async function uploadFile(req, res) {
  try {
    const url = await storageService.upload(req);
    res.json({ ok: true, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

export async function deleteFile(req, res) {
  try {
    await storageService.remove(req.params.path);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

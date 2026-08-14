import { saveIVA, getIVAByCuit, deleteIVA } from "../db/iva.js";

export async function createIVA(data) {
  return await saveIVA(data);
}

export async function fetchIVA(cuit) {
  return await getIVAByCuit(cuit);
}

export async function removeIVA(id) {
  return await deleteIVA(id);
}

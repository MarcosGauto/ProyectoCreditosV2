import "../admin.js";
import { db } from "../lib/firebase-admin.js";

const collection = db.collection("iva");

export async function createIVA(data) {
  const ref = await collection.add(data);
  return { id: ref.id, ...data };
}

export async function fetchIVA(cuit) {
  const snap = await collection.where("cuit", "==", cuit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function removeIVA(id) {
  await collection.doc(id).delete();
  return true;
}

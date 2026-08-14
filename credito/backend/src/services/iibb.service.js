import "../admin.js";
import { db } from "../lib/firebase-admin.js";

const collection = db.collection("iibb");

export async function createIIBB(data) {
  const ref = await collection.add(data);
  return { id: ref.id, ...data };
}

export async function fetchIIBB(cuit) {
  const snap = await collection.where("cuit", "==", cuit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function removeIIBB(id) {
  await collection.doc(id).delete();
  return true;
}

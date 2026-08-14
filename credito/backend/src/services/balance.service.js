import "../admin.js";
import { db } from "../lib/firebase-admin.js";

export async function save(data) {
  return db.collection("balances").add(data);
}

export async function getByCuit(cuit) {
  const snap = await db
    .collection("balances")
    .where("cuit", "==", cuit)
    .orderBy("periodo", "desc")
    .limit(1)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

import db from "../utils/db.js";

export async function saveIIBB(data) {
  return db.iibb.create({ data });
}

export async function getIIBBByCuit(cuit) {
  return db.iibb.findMany({
    where: { cuit },
    orderBy: { periodo: "desc" }
  });
}

export async function deleteIIBB(id) {
  return db.iibb.delete({
    where: { id }
  });
}

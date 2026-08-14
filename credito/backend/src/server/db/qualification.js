import db from "./db.js";

export function saveQualification(data) {
  return db.qualification.create({ data });
}

export function getQualificationByCuit(cuit) {
  return db.qualification.findMany({
    where: { cuit },
    orderBy: { createdAt: "desc" },
  });
}

export function deleteQualification(id) {
  return db.qualification.delete({
    where: { id },
  });
}

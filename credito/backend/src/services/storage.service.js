import admin from "../admin.js";
import { v4 as uuid } from "uuid";

const bucket = admin.storage().bucket();

export async function upload(req) {
  const file = req.files?.file;
  if (!file) throw new Error("No file uploaded.");

  const filename = `${Date.now()}-${uuid()}-${file.name}`;
  const fileUpload = bucket.file(filename);

  await fileUpload.save(file.data, {
    metadata: { contentType: file.mimetype },
  });

  return fileUpload.publicUrl();
}

export async function remove(path) {
  await bucket.file(path).delete();
}

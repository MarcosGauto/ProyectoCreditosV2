import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    cliente: { type: String, required: true },
    tipo: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    archivoUrl: { type: String, required: true },
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", DocumentSchema);

export default Document;

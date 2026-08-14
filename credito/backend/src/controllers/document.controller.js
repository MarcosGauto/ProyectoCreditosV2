import Document from "../models/document.model.js";

// 📄 Obtener todos los documentos
export const getAllDocuments = async (req, res) => {
  try {
    const documentos = await Document.find();
    res.json(documentos);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo documentos" });
  }
};

// 🔍 Buscar documentos
export const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;
    const documentos = await Document.find({
      $or: [
        { cliente: new RegExp(query, "i") },
        { tipo: new RegExp(query, "i") },
      ],
    });
    res.json(documentos);
  } catch (error) {
    res.status(500).json({ message: "Error en la búsqueda" });
  }
};

// 🗑️ Eliminar documento
export const deleteDocument = async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error eliminando documento" });
  }
};

// 📤 Subir documento (para integrar con Firebase si querés)
export const uploadDocument = async (req, res) => {
  try {
    const { cliente, tipo, archivoUrl } = req.body;
    const nuevoDocumento = new Document({ cliente, tipo, archivoUrl });
    await nuevoDocumento.save();
    res.status(201).json(nuevoDocumento);
  } catch (error) {
    res.status(500).json({ message: "Error subiendo documento" });
  }
};

"use client";
import { useState } from "react";

export default function FileUpload({ label = "Subir PDF", onFileSelect }) {
  const [fileName, setFileName] = useState("");

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    onFileSelect(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">{label}</label>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="border p-2 rounded"
      />

      {fileName && (
        <p className="text-sm text-gray-600">📄 {fileName}</p>
      )}
    </div>
  );
}

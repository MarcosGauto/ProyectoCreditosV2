export const downloadQualificationPDF = async (qualificationData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/pdf/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(qualificationData),
  });

  if (!res.ok) throw new Error("Error descargando el PDF");

  // Convertir el PDF a blob
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  // Descargar automáticamente
  const link = document.createElement("a");
  link.href = url;
  link.download = `calificacion_${Date.now()}.pdf`;
  link.click();

  window.URL.revokeObjectURL(url);
};

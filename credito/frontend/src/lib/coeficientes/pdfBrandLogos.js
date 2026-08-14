/**
 * Logos de marcas para el footer del PDF comercial.
 * Archivos en /public/pdf-brands/
 */

/** @typedef {{ id: string; label: string; paths: string[] }} PdfBrandLogoDef */

/** @type {PdfBrandLogoDef[]} */
export const PDF_BRAND_LOGOS = [
  { id: "payway", label: "Payway", paths: ["/pdf-brands/payway.jfif", "/pdf-brands/payway.png"] },
  {
    id: "mercado-pago",
    label: "Mercado Pago",
    paths: ["/pdf-brands/mercado.png", "/pdf-brands/mercado-pago.png"],
  },
  { id: "amex", label: "AMEX", paths: ["/pdf-brands/amex.png"] },
  { id: "cabal", label: "CABAL", paths: ["/pdf-brands/cabal.png"] },
  { id: "cliper", label: "Cliper", paths: ["/pdf-brands/cliper.png"] },
  {
    id: "favacard",
    label: "Favacard",
    paths: ["/pdf-brands/fava.png", "/pdf-brands/favacard.png"],
  },
  { id: "naranja", label: "Naranja", paths: ["/pdf-brands/naranja.png"] },
  { id: "pactar", label: "Pactar", paths: ["/pdf-brands/pactar.jpg", "/pdf-brands/pactar.png"] },
  {
    id: "pymenacion",
    label: "Pymenación",
    paths: ["/pdf-brands/pymenacion.png"],
  },
];

/** @type {Map<string, { dataUrl: string; aspect: number }>} */
const logoCache = new Map();

/**
 * @param {string} path
 */
async function fetchAsBlob(path) {
  const response = await fetch(path);
  if (!response.ok) return null;
  return response.blob();
}

/**
 * @param {Blob} blob
 * @param {number} targetHeightPx
 */
function rasterizeImageBlob(blob, targetHeightPx) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight || 1;
      const h = targetHeightPx;
      const w = Math.max(1, Math.round(h * aspect));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas no disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        aspect,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo rasterizar la imagen"));
    };
    img.src = url;
  });
}

/**
 * @param {string} svgText
 * @param {number} targetHeightPx
 */
function rasterizeSvgText(svgText, targetHeightPx) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  return rasterizeImageBlob(blob, targetHeightPx);
}

/**
 * @param {string} path
 */
function isVectorLogoPath(path) {
  return path.endsWith(".svg");
}

/**
 * @param {PdfBrandLogoDef} brand
 * @param {number} targetHeightPx
 */
async function loadBrandLogo(brand, targetHeightPx) {
  const cacheKey = `${brand.id}@${targetHeightPx}`;
  const cached = logoCache.get(cacheKey);
  if (cached) return { ...brand, ...cached, loaded: true };

  for (const path of brand.paths) {
    try {
      const blob = await fetchAsBlob(path);
      if (!blob) continue;

      const result = isVectorLogoPath(path)
        ? await rasterizeSvgText(await blob.text(), targetHeightPx)
        : await rasterizeImageBlob(blob, targetHeightPx);

      logoCache.set(cacheKey, result);
      return { ...brand, ...result, loaded: true };
    } catch {
      // siguiente path
    }
  }

  return { ...brand, dataUrl: null, aspect: null, loaded: false };
}

/**
 * @param {number} [targetHeightPx=26]
 */
export async function loadPdfBrandLogos(targetHeightPx = 26) {
  return Promise.all(
    PDF_BRAND_LOGOS.map((brand) => loadBrandLogo(brand, targetHeightPx))
  );
}

/** Altura reservada del footer en mm (línea + logos). */
export const PDF_BRANDS_FOOTER_HEIGHT_MM = 24;

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @param {Awaited<ReturnType<typeof loadPdfBrandLogos>>} brands
 */
export function drawPdfBrandsFooter(doc, pageWidth, pageHeight, brands) {
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const footerTop = pageHeight - PDF_BRANDS_FOOTER_HEIGHT_MM;
  const logoHeightMm = 7.5;
  const gapMm = 4;
  const textFallbackWidthMm = 18;

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.line(margin, footerTop, pageWidth - margin, footerTop);

  const items = brands.map((brand) => {
    if (brand.loaded && brand.dataUrl && brand.aspect) {
      const w = logoHeightMm * brand.aspect;
      return { type: "image", brand, widthMm: w };
    }
    return { type: "text", brand, widthMm: textFallbackWidthMm };
  });

  let totalWidth =
    items.reduce((sum, item) => sum + item.widthMm, 0) +
    gapMm * Math.max(0, items.length - 1);

  let scale = 1;
  if (totalWidth > contentWidth) {
    scale = contentWidth / totalWidth;
  }

  const scaledLogoH = logoHeightMm * scale;
  const scaledGap = gapMm * scale;
  totalWidth =
    items.reduce((sum, item) => sum + item.widthMm * scale, 0) +
    scaledGap * Math.max(0, items.length - 1);

  let x = margin + (contentWidth - totalWidth) / 2;
  const logoY = footerTop + 5 + (PDF_BRANDS_FOOTER_HEIGHT_MM - 5 - scaledLogoH) / 2;

  for (const item of items) {
    const itemW = item.widthMm * scale;

    if (item.type === "image" && item.brand.dataUrl) {
      doc.addImage(item.brand.dataUrl, "PNG", x, logoY, itemW, scaledLogoH);
    } else {
      const fontSize = Math.max(5.5, 7 * scale);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(107, 114, 128);
      doc.text(item.brand.label, x + itemW / 2, logoY + scaledLogoH * 0.68, {
        align: "center",
      });
    }

    x += itemW + scaledGap;
  }
}

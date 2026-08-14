/** Rutas posibles del logo institucional (primera disponible). */
export const GRUPO_NUCLEO_LOGO_PATHS = [
  "/pdf-brands/logo gn.jpg",
  "/logo-grupo-nucleo.png",
  "/pdf-brands/grupo-nucleo.png",
];

/** @deprecated Usar GRUPO_NUCLEO_LOGO_PATHS */
export const GRUPO_NUCLEO_LOGO_PATH = GRUPO_NUCLEO_LOGO_PATHS[1];

/** @type {{ dataUrl: string; format: string; aspect: number } | null} */
let cachedLogoImage = null;

/**
 * @param {string} path
 * @param {Blob} blob
 */
function resolveImageFormat(path, blob) {
  const type = String(blob.type || "").toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg") || /\.jpe?g$|\.jfif$/i.test(path)) {
    return "JPEG";
  }
  if (type.includes("png") || path.endsWith(".png")) {
    return "PNG";
  }
  return "JPEG";
}

/**
 * @param {Blob} blob
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Error al leer el logo."));
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {string} dataUrl
 */
function readImageAspect(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspect =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : 1;
      resolve(aspect);
    };
    img.onerror = () => reject(new Error("No se pudo leer dimensiones del logo."));
    img.src = dataUrl;
  });
}

/**
 * @returns {Promise<{ dataUrl: string; format: string; aspect: number }>}
 */
export async function loadGrupoNucleoLogoImage() {
  if (cachedLogoImage) {
    return cachedLogoImage;
  }

  let lastError = null;
  for (const path of GRUPO_NUCLEO_LOGO_PATHS) {
    try {
      const response = await fetch(encodeURI(path));
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      const format = resolveImageFormat(path, blob);
      const aspect = await readImageAspect(dataUrl);
      cachedLogoImage = { dataUrl, format, aspect };
      return cachedLogoImage;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No se pudo cargar el logo de Grupo Núcleo.");
}

/**
 * @returns {Promise<string>}
 */
export async function loadGrupoNucleoLogoDataUrl() {
  const image = await loadGrupoNucleoLogoImage();
  return image.dataUrl;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {{
 *   x?: number;
 *   y?: number;
 *   size?: number;
 *   height?: number;
 *   pageNumber?: number;
 *   align?: "left" | "right";
 *   rightMargin?: number;
 *   leftMargin?: number;
 * }} [options]
 * @returns {Promise<{ bottom: number; right: number } | null>}
 */
export async function addGrupoNucleoLogoToJsPdf(doc, options = {}) {
  const pageNumber = options.pageNumber ?? 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const height = options.height ?? options.size ?? 16;
  const y = options.y ?? 8;
  const rightMargin = options.rightMargin ?? 14;
  const leftMargin = options.leftMargin ?? 14;

  doc.setPage(pageNumber);

  try {
    const { dataUrl, format, aspect } = await loadGrupoNucleoLogoImage();
    const width = height * aspect;

    let x = options.x;
    if (x == null) {
      x =
        options.align === "left"
          ? leftMargin
          : pageWidth - width - rightMargin;
    }

    doc.addImage(dataUrl, format, x, y, width, height);
    return { bottom: y + height, right: x + width };
  } catch (error) {
    console.warn("[pdfBranding]", error);
    return null;
  }
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {{
 *   size?: number;
 *   height?: number;
 *   y?: number;
 *   rightMargin?: number;
 * }} [options]
 */
export async function stampGrupoNucleoLogoOnAllJsPdfPages(doc, options = {}) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    await addGrupoNucleoLogoToJsPdf(doc, {
      ...options,
      pageNumber: page,
      align: "right",
    });
  }
}

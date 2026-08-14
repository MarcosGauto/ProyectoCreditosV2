/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractBalancePdfText(file) {
  const pdfjsLib = await import("pdfjs-dist/webpack")
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker?.default?.toString?.() ||
    (typeof pdfjsWorker === "string" ? pdfjsWorker : pdfjsWorker.toString())

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ""
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    fullText += `${textContent.items.map((item) => item.str).join(" ")}\n`
  }

  return fullText.trim()
}

/**
 * @param {string} fileName
 */
export function getBalanceFileKind(fileName) {
  const lower = String(fileName ?? "").toLowerCase()
  if (/\.(xlsx|xls)$/.test(lower)) {
    return "excel"
  }
  if (/\.pdf$/.test(lower)) {
    return "pdf"
  }
  if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(lower)) {
    return "image"
  }
  return "other"
}

/**
 * @param {File} file
 */
export function getBalanceFileKindFromFile(file) {
  const mime = String(file.type ?? "").toLowerCase()
  if (mime.includes("spreadsheet") || mime.includes("excel")) {
    return "excel"
  }
  if (mime === "application/pdf") {
    return "pdf"
  }
  if (mime.startsWith("image/")) {
    return "image"
  }
  return getBalanceFileKind(file.name)
}

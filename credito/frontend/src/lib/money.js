/**
 * Formato monetario AR con 2 decimales (sin símbolo).
 * @param {unknown} value
 * @returns {string}
 */
export function formatMoney(value) {
  const parsed = parseMoney(value)
  return Number(parsed ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatMoneyWithSymbol(value) {
  return `$ ${formatMoney(value)}`
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseMoney(value) {
  if (value == null || value === "") {
    return null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  let normalized = trimmed.replace(/\$/g, "").replace(/\s/g, "")
  const isNegative = normalized.startsWith("-")
  if (isNegative) {
    normalized = normalized.slice(1)
  }

  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  let numeric = normalized

  if (hasComma && hasDot) {
    numeric = normalized.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    const parts = normalized.split(",")
    if (parts.length === 2 && parts[1].length <= 2) {
      numeric = `${parts[0]}.${parts[1]}`
    } else {
      numeric = normalized.replace(/,/g, "")
    }
  } else if (hasDot) {
    const parts = normalized.split(".")
    if (parts.length === 2 && parts[1].length <= 2) {
      numeric = normalized
    } else if (parts.length > 2) {
      numeric = normalized.replace(/\./g, "")
    } else if (parts.length === 2 && parts[1].length === 3) {
      numeric = normalized.replace(/\./g, "")
    }
  }

  const parsed = Number(numeric)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return isNegative ? -parsed : parsed
}

/** @alias parseMoney — entrada de formularios monetarios */
export const parseMoneyInput = parseMoney

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function roundMoneyForFirestore(value) {
  const parsed = parseMoney(value)
  if (parsed === null) {
    return null
  }
  return Number(Number(parsed).toFixed(2))
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function amountToFormString(value) {
  const parsed = parseMoney(value)
  if (parsed === null) {
    return ""
  }
  return Number(parsed).toFixed(2)
}

/**
 * Valor para input type="number" (admite escritura parcial).
 * @param {unknown} raw
 * @returns {string | number}
 */
export function toNumberInputValue(raw) {
  if (raw === "" || raw == null) {
    return ""
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (trimmed === "" || trimmed === "-" || trimmed === ".") {
      return trimmed
    }
    if (/^-?\d+\.$/.test(trimmed)) {
      return trimmed
    }
    if (/^-?\d*\.?\d{0,2}$/.test(trimmed)) {
      return trimmed
    }
  }

  const parsed = parseMoney(raw)
  if (parsed === null) {
    return ""
  }

  return Number(parsed.toFixed(2))
}

/**
 * @param {string} val
 * @returns {string | null} null = ignorar cambio inválido
 */
export function fromNumberInputChange(val) {
  const normalized = val.replace(",", ".")
  if (normalized === "") {
    return ""
  }
  if (!/^-?\d*\.?\d{0,2}$/.test(normalized)) {
    return null
  }
  return normalized
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMoneyInputOnBlur(raw) {
  if (raw === "" || raw == null) {
    return ""
  }
  return amountToFormString(raw)
}

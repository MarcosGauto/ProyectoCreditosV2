const DATA_PREFIX = "bcra_data_";
const ERROR_PREFIX = "bcra_error_";

export function bcraDataKey(cuit) {
  return `${DATA_PREFIX}${cuit}`;
}

export function bcraErrorKey(cuit) {
  return `${ERROR_PREFIX}${cuit}`;
}

/**
 * @param {string} cuit
 */
export function clearBcraSession(cuit) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(bcraDataKey(cuit));
  sessionStorage.removeItem(bcraErrorKey(cuit));
}

/**
 * @param {string} cuit
 * @param {Record<string, unknown>} data
 */
export function saveBcraData(cuit, data) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(bcraDataKey(cuit), JSON.stringify(data));
  sessionStorage.removeItem(bcraErrorKey(cuit));
}

/**
 * @param {string} cuit
 * @param {{ message?: string; code?: string; error?: string }} payload
 */
export function saveBcraError(cuit, payload) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(bcraDataKey(cuit));
  sessionStorage.setItem(
    bcraErrorKey(cuit),
    JSON.stringify({
      ...payload,
      at: Date.now(),
    })
  );
}

/**
 * @param {string} cuit
 * @returns {Record<string, unknown> | null}
 */
export function loadBcraData(cuit) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(bcraDataKey(cuit));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} cuit
 * @returns {{ message?: string; code?: string; error?: string; at?: number } | null}
 */
export function loadBcraError(cuit) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(bcraErrorKey(cuit));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

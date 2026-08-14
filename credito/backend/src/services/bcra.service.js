import axios from "axios";

const BCRA_BASE_URL = "https://api.bcra.gob.ar/centraldedeudores/v1.0";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"]);

/** @typedef {'CON_DEUDA' | 'SIN_DEUDA'} BcraEstadoDeuda */

export class BcraFetchError extends Error {
  /**
   * @param {string} message
   * @param {{
   *   cause?: unknown;
   *   url?: string;
   *   status?: number;
   *   body?: unknown;
   *   code?: string;
   * }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "BcraFetchError";
    this.url = options.url;
    this.status = options.status;
    this.body = options.body;
    this.code = options.code;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * @param {unknown} cuit
 * @returns {string}
 */
function normalizeCuit(cuit) {
  return String(cuit).replace(/\D/g, "");
}

/**
 * @param {unknown} error
 * @returns {string | undefined}
 */
function getErrorCode(error) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" && /timeout/i.test(error.message)) {
      return "ETIMEDOUT";
    }
    return error.code ?? undefined;
  }

  const err = /** @type {Record<string, unknown>} */ (error);
  if (typeof err.code === "string") {
    return err.code;
  }

  const cause = err.cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return String(/** @type {{ code?: unknown }} */ (cause).code);
  }

  return undefined;
}

/**
 * @param {unknown} error
 * @returns {unknown}
 */
function getErrorCause(error) {
  if (axios.isAxiosError(error)) {
    return error.cause ?? error;
  }
  if (error instanceof Error && "cause" in error) {
    return error.cause;
  }
  return error;
}

/**
 * @param {unknown} cause
 * @returns {number | undefined}
 */
function getErrno(cause) {
  return cause && typeof cause === "object" && "errno" in cause
    ? Number(/** @type {{ errno?: unknown }} */ (cause).errno)
    : undefined;
}

/**
 * @param {unknown} cause
 * @returns {string | undefined}
 */
function getSyscall(cause) {
  return cause && typeof cause === "object" && "syscall" in cause
    ? String(/** @type {{ syscall?: unknown }} */ (cause).syscall)
    : undefined;
}

/**
 * @param {string} url
 * @param {number} attempt
 * @param {unknown} error
 */
function logAttemptFailure(url, attempt, error) {
  const cause = getErrorCause(error);
  const code = getErrorCode(error);

  console.error("[BCRA] attempt failed", {
    url,
    attempt,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    code,
    errno: getErrno(cause),
    syscall: getSyscall(cause),
    status: error instanceof BcraFetchError ? error.status : undefined,
    body: error instanceof BcraFetchError ? error.body : undefined,
    cause,
  });
}

/**
 * @param {unknown} error
 * @param {string} url
 * @returns {BcraFetchError}
 */
function toBcraFetchError(error, url) {
  if (error instanceof BcraFetchError) {
    return error;
  }

  const code = getErrorCode(error) ?? "BCRA_NETWORK_ERROR";
  const messageByCode = {
    ECONNRESET: "Conexión interrumpida con BCRA (ECONNRESET)",
    ETIMEDOUT: "Timeout al consultar BCRA (ETIMEDOUT)",
    ECONNABORTED: "Conexión abortada al consultar BCRA (ECONNABORTED)",
    ECONNREFUSED: "No se pudo conectar con BCRA (ECONNREFUSED)",
    ENOTFOUND: "No se pudo resolver el host de BCRA (ENOTFOUND)",
  };

  const message =
    messageByCode[code] ??
    (error instanceof Error ? error.message : "Error de conexión con BCRA");

  return new BcraFetchError(message, {
    cause: error,
    url,
    code,
  });
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isRetryable(error) {
  const code = getErrorCode(error);
  return code != null && RETRYABLE_CODES.has(code);
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 */
async function requestBcraOnce(url) {
  return axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      "User-Agent": "ChipiCreditos/1.0 (credit-analysis)",
    },
    validateStatus: () => true,
  });
}

/**
 * @param {number} status
 * @param {Record<string, unknown> | null | undefined} data
 * @param {string} url
 * @returns {never}
 */
function throwForHttpStatus(status, data, url) {
  if (status === 404) {
    throw new BcraFetchError("CUIT no encontrado en el Central de Deudores", {
      url,
      status: 404,
      body: data,
      code: "BCRA_CUIT_NOT_FOUND",
    });
  }

  throw new BcraFetchError(`Error del BCRA (HTTP ${status})`, {
    url,
    status,
    body: data,
    code: "BCRA_HTTP_ERROR",
  });
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} url
 * @returns {never}
 */
function throwForMissingResults(data, url) {
  const apiStatus = data?.status;

  if (apiStatus === 404 || apiStatus === "404") {
    throw new BcraFetchError("CUIT no encontrado en el Central de Deudores", {
      url,
      status: 404,
      body: data,
      code: "BCRA_CUIT_NOT_FOUND",
    });
  }

  throw new BcraFetchError("CUIT inexistente o sin respuesta del BCRA", {
    url,
    body: data,
    code: "BCRA_CUIT_NOT_FOUND",
  });
}

/**
 * @param {Record<string, unknown>} results
 * @returns {BcraEstadoDeuda}
 */
export function resolveEstadoDeuda(results) {
  const denominacion = String(results.denominacion ?? "").trim();
  if (!denominacion) {
    return "SIN_DEUDA";
  }

  const periodos = Array.isArray(results.periodos) ? results.periodos : [];
  const flatEntidades = Array.isArray(results.entidades) ? results.entidades : [];

  const tieneDeudaEnPeriodos = periodos.some(
    (p) =>
      p &&
      typeof p === "object" &&
      Array.isArray(/** @type {{ entidades?: unknown[] }} */ (p).entidades) &&
      /** @type {{ entidades: unknown[] }} */ (p).entidades.length > 0
  );

  if (tieneDeudaEnPeriodos || flatEntidades.length > 0) {
    return "CON_DEUDA";
  }

  return "SIN_DEUDA";
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} url
 * @returns {Record<string, unknown>}
 */
function parseBcraPayload(data, url) {
  if (data?.results == null) {
    throwForMissingResults(data, url);
  }

  const results = /** @type {Record<string, unknown>} */ (data.results);
  const denominacion = String(results.denominacion ?? "").trim();

  if (!denominacion) {
    throw new BcraFetchError("CUIT sin denominación en respuesta BCRA", {
      url,
      body: data,
      code: "BCRA_CUIT_NOT_FOUND",
    });
  }

  return results;
}

/**
 * @param {string} cuit
 * @returns {Promise<{ results: Record<string, unknown>; estadoDeuda: BcraEstadoDeuda }>}
 */
export async function fetchBCRA(cuit) {
  const id = normalizeCuit(cuit);

  if (!id || id.length < 10 || id.length > 11) {
    throw new BcraFetchError("CUIT inválido", { code: "INVALID_CUIT" });
  }

  const url = `${BCRA_BASE_URL}/Deudas/${id}`;
  console.info("[BCRA] GET", url);

  /** @type {BcraFetchError | undefined} */
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        const delayMs = 500 * (attempt - 1);
        console.info("[BCRA] retry", { attempt, delayMs, url });
        await sleep(delayMs);
      }

      const response = await requestBcraOnce(url);
      const { status, statusText, headers, data } = response;

      console.info("[BCRA] response", {
        url,
        attempt,
        status,
        statusText,
        headers:
          headers && typeof headers.toJSON === "function"
            ? headers.toJSON()
            : headers,
        body: data,
      });

      if (status >= 400) {
        throwForHttpStatus(status, data, url);
      }

      const results = parseBcraPayload(data, url);
      const estadoDeuda = resolveEstadoDeuda(results);

      console.info("[BCRA] parsed", {
        url,
        denominacion: results.denominacion,
        estadoDeuda,
        periodos: Array.isArray(results.periodos) ? results.periodos.length : 0,
      });

      return { results, estadoDeuda };
    } catch (error) {
      logAttemptFailure(url, attempt, error);

      lastError = toBcraFetchError(error, url);

      if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
        continue;
      }

      throw lastError;
    }
  }

  throw (
    lastError ??
    new BcraFetchError("Error de conexión con BCRA", { url, code: "BCRA_UNKNOWN" })
  );
}

import { fetchBCRA, BcraFetchError } from "../services/bcra.service.js";
import { mapBCRAToCleanFormat } from "../services/bcra.mapper.js";

export async function bcraController(req, res) {
  const { cuit } = req.params;

  try {
    const { results, estadoDeuda } = await fetchBCRA(cuit);
    const formatted = mapBCRAToCleanFormat(results);

    console.info("[BCRA] controller ok", {
      cuit,
      denominacion: formatted.denominacion,
      entidades: formatted.entidades?.length ?? 0,
      estadoDeuda,
    });

    return res.json({
      ...formatted,
      estadoDeuda,
    });
  } catch (error) {
    const isBcraError = error instanceof BcraFetchError;
    const code = isBcraError ? error.code : getErrorCode(error);
    const status = isBcraError && error.code === "BCRA_CUIT_NOT_FOUND" ? 404 : 500;

    console.error("[BCRA] controller error", {
      cuit,
      httpStatus: status,
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
      code,
      url: isBcraError ? error.url : undefined,
      bcraStatus: isBcraError ? error.status : undefined,
      body: isBcraError ? error.body : undefined,
      cause: error instanceof Error && "cause" in error ? error.cause : undefined,
    });

    if (status === 404) {
      return res.status(404).json({
        error: "CUIT no encontrado en BCRA",
        message: error instanceof Error ? error.message : "CUIT no encontrado",
        code,
      });
    }

    return res.status(500).json({
      error: "Error al consultar BCRA",
      message: error instanceof Error ? error.message : "Error desconocido",
      code,
    });
  }
}

/**
 * @param {unknown} error
 * @returns {string | undefined}
 */
function getErrorCode(error) {
  if (!error || typeof error !== "object") {
    return undefined;
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

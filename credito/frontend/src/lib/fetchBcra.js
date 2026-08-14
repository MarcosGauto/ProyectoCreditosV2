/**
 * @returns {string}
 */
export function getBcraApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
}

/**
 * @param {string} cuit
 * @returns {Promise<{
 *   ok: boolean;
 *   status: number;
 *   data?: Record<string, unknown>;
 *   error?: { error?: string; message?: string; code?: string };
 * }>}
 */
export async function fetchBcraByCuit(cuit) {
  const id = String(cuit).replace(/\D/g, "");
  const url = `${getBcraApiBaseUrl()}/api/bcra/${id}`;

  const response = await fetch(url);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "code" in body
        ? String(body.code)
        : undefined;

    const defaultMessage =
      response.status === 404
        ? "CUIT no encontrado en el Central de Deudores."
        : code === "ETIMEDOUT"
          ? "La consulta al BCRA excedió el tiempo de espera."
          : code === "ECONNRESET"
            ? "La conexión con BCRA fue interrumpida. Intentá nuevamente."
            : `Error al consultar BCRA (HTTP ${response.status})`;

    return {
      ok: false,
      status: response.status,
      error: {
        error:
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "Error al consultar BCRA",
        message:
          body && typeof body === "object" && "message" in body
            ? String(body.message)
            : defaultMessage,
        code,
      },
    };
  }

  return {
    ok: true,
    status: response.status,
    data: body && typeof body === "object" ? body : {},
  };
}

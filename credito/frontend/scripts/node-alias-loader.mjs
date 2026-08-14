import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/**
 * @param {string} relativePath
 */
function resolveAliasTarget(relativePath) {
  const base = path.join(frontendRoot, "src", relativePath);
  if (fs.existsSync(`${base}.js`)) {
    return pathToFileURL(`${base}.js`).href;
  }
  if (fs.existsSync(path.join(base, "index.js"))) {
    return pathToFileURL(path.join(base, "index.js")).href;
  }
  return pathToFileURL(base).href;
}

/**
 * Resuelve imports "@/..." usados en src/ para scripts Node sin Next.js.
 * @param {string} specifier
 * @param {import("node:module").ResolveHookContext} context
 * @param {import("node:module").ResolveHook} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(resolveAliasTarget(specifier.slice(2)), context);
  }
  return nextResolve(specifier, context);
}

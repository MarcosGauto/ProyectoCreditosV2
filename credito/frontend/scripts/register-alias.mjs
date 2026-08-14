import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

register(pathToFileURL(path.join(scriptDir, "node-alias-loader.mjs")), import.meta.url);

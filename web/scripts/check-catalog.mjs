import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const catalog = JSON.parse(
  readFileSync(
    new URL("../public/catalog/catalog.json", import.meta.url),
    "utf8",
  ),
);
const files = new URL("../public/catalog/files/", import.meta.url);
const allowedExtensions = new Set(["txt", "md", "zip"]);
const names = new Set();
const ids = new Set();
const kinds = new Set(["prompt", "skill", "agente", "automatizacion", "otro"]);

if (!Array.isArray(catalog)) throw new Error("El catálogo debe ser una lista");

for (const [index, resource] of catalog.entries()) {
  if (!resource || !kinds.has(resource.kind))
    throw new Error(`Tipo inválido en recurso ${index + 1}`);
  for (const field of ["title", "description", "file"]) {
    if (typeof resource[field] !== "string" || !resource[field].trim())
      throw new Error(`Falta ${field} en recurso ${index + 1}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(txt|md|zip)$/.test(resource.file))
    throw new Error(`Nombre de archivo inválido: ${resource.file}`);
  const extension = resource.file.split(".").at(-1);
  if (!allowedExtensions.has(extension))
    throw new Error(`Extensión inválida: ${resource.file}`);
  if (names.has(resource.file))
    throw new Error(`Archivo duplicado: ${resource.file}`);
  names.add(resource.file);
  if (resource.id !== undefined) {
    if (typeof resource.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(resource.id))
      throw new Error(`ID inválido en recurso ${index + 1}`);
    if (ids.has(resource.id)) throw new Error(`ID duplicado: ${resource.id}`);
    ids.add(resource.id);
  }
  const path = join(files.pathname, resource.file);
  if (!existsSync(path) || !statSync(path).isFile())
    throw new Error(`No existe el archivo público: ${resource.file}`);
}

console.log(`Catálogo válido: ${catalog.length} recursos`);

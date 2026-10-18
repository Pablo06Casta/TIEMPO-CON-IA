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
  if (resource.tags !== undefined) {
    if (!Array.isArray(resource.tags) || resource.tags.length > 12 ||
      resource.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag !== tag.trim() || tag.length > 40 || /[\x00-\x1f\x7f]/.test(tag)) ||
      new Set(resource.tags.map((tag) => tag.toLocaleLowerCase("es"))).size !== resource.tags.length)
      throw new Error(`Etiquetas inválidas en recurso ${index + 1}`);
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

const complements = JSON.parse(
  readFileSync(new URL("../public/catalog/complements.json", import.meta.url), "utf8"),
);
if (!Array.isArray(complements)) throw new Error("Los complementos deben ser una lista");
const complementIds = new Set();
for (const [index, complement] of complements.entries()) {
  if (!complement || typeof complement.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(complement.id))
    throw new Error(`ID inválido en complemento ${index + 1}`);
  if (complementIds.has(complement.id)) throw new Error(`Complemento duplicado: ${complement.id}`);
  complementIds.add(complement.id);
  for (const field of ["title", "description"]) {
    if (typeof complement[field] !== "string" || !complement[field].trim())
      throw new Error(`Falta ${field} en complemento ${index + 1}`);
  }
  if (!Array.isArray(complement.skills) || complement.skills.length < 2 || new Set(complement.skills).size !== complement.skills.length)
    throw new Error(`Un complemento necesita al menos dos skills distintas: ${complement.id}`);
  for (const skillId of complement.skills) {
    if (!catalog.some((resource) => resource.id === skillId && resource.kind === "skill") &&
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(skillId))
      throw new Error(`Skill inválida en ${complement.id}: ${skillId}`);
  }
}
console.log(`Complementos válidos: ${complements.length}`);

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { slug } from "../complements-core.js";

const catalogPath = fileURLToPath(new URL("../public/catalog/catalog.json", import.meta.url));
const complementsPath = fileURLToPath(new URL("../public/catalog/complements.json", import.meta.url));
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!args[i]?.startsWith("--") || !args[i + 1] || args[i + 1].startsWith("--"))
    throw new Error("Uso: npm run complements:add -- --title TÍTULO --description DESCRIPCIÓN --skills id1,id2 [--id ID]");
  if (options[args[i]]) throw new Error(`Opción repetida: ${args[i]}`);
  options[args[i]] = args[i + 1];
}
if (Object.keys(options).some((key) => !["--title", "--description", "--skills", "--id"].includes(key)))
  throw new Error("Opción desconocida");

const title = options["--title"]?.trim();
const description = options["--description"]?.trim();
const skills = options["--skills"]?.split(",").map((value) => value.trim());
const id = options["--id"] || slug(title || "");
if (!title || title.length > 80 || !description || description.length > 240)
  throw new Error("Título (máximo 80) y descripción (máximo 240) son obligatorios");
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error("ID inválido");
if (!skills || skills.length < 2 || new Set(skills).size !== skills.length)
  throw new Error("Indica al menos dos IDs de skills distintas");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
for (const skillId of skills) {
  if (!catalog.some((item) => item.id === skillId && item.kind === "skill") &&
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(skillId))
    throw new Error(`La skill ${skillId} no es una skill estática ni un ID válido del estudio`);
}
const complements = JSON.parse(readFileSync(complementsPath, "utf8"));
const index = complements.findIndex((item) => item.id === id);
const entry = { id, title, description, skills };
if (index >= 0) complements[index] = entry;
else complements.push(entry);
const temporary = `${complementsPath}.${process.pid}.tmp`;
writeFileSync(temporary, `${JSON.stringify(complements, null, 2)}\n`);
renameSync(temporary, complementsPath);
console.log(`${index >= 0 ? "Actualizado" : "Añadido"}: ${title} (${skills.length} skills)`);

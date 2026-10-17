import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogDir = fileURLToPath(new URL("../public/catalog/", import.meta.url));
const catalogPath = join(catalogDir, "catalog.json");
const filesDir = join(catalogDir, "files");
const kinds = new Set(["prompt", "skill", "agente", "automatizacion", "otro"]);
const extensions = new Set([".txt", ".md", ".zip"]);

function argsOf(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key?.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--"))
      throw new Error("Uso: npm run catalog:add -- --source RUTA --kind TIPO --title TÍTULO --description DESCRIPCIÓN [--id ID]");
    if (options[key]) throw new Error(`Opción repetida: ${key}`);
    options[key] = argv[i + 1];
  }
  for (const key of Object.keys(options)) {
    if (!["--source", "--kind", "--title", "--description", "--id"].includes(key))
      throw new Error(`Opción desconocida: ${key}`);
  }
  return options;
}

function slug(text) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 64).replace(/-$/, "");
}

const options = argsOf(process.argv.slice(2));
const source = options["--source"] && resolve(options["--source"]);
const kind = options["--kind"];
const title = options["--title"]?.trim();
const description = options["--description"]?.trim();
if (!source || !existsSync(source) || !statSync(source).isFile())
  throw new Error("El archivo de origen no existe");
if (!kinds.has(kind)) throw new Error("Tipo inválido");
if (!title || !description) throw new Error("Título y descripción son obligatorios");
const extension = extname(source).toLowerCase();
if (!extensions.has(extension)) throw new Error("Solo se admiten .txt, .md y .zip");
if (statSync(source).size > 20 * 1024 * 1024)
  throw new Error("El archivo supera el límite de 20 MB");
const id = options["--id"] || `${kind}-${slug(title)}`;
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error("ID inválido");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
if (!Array.isArray(catalog)) throw new Error("Catálogo inválido");
const index = catalog.findIndex((resource) => resource.id === id);
const oldFile = index >= 0 ? catalog[index].file : null;
const file = `${id}${extension}`;
if (catalog.some((resource, position) => position !== index && resource.file === file))
  throw new Error(`El archivo público ${file} ya pertenece a otro recurso`);
if (index < 0 && existsSync(join(filesDir, file)))
  throw new Error(`El archivo público ${file} ya existe sin ficha`);

const entry = { id, kind, title, description, file };
if (index >= 0) catalog[index] = entry;
else catalog.push(entry);

const destination = join(filesDir, file);
if (source !== destination) copyFileSync(source, destination);
const temporary = `${catalogPath}.${process.pid}.tmp`;
try {
  writeFileSync(temporary, `${JSON.stringify(catalog, null, 2)}\n`);
  renameSync(temporary, catalogPath);
} finally {
  if (existsSync(temporary)) rmSync(temporary);
}
if (oldFile && oldFile !== file && !catalog.some((item) => item.file === oldFile))
  rmSync(join(filesDir, basename(oldFile)), { force: true });
console.log(`${index < 0 ? "Añadido" : "Actualizado"}: ${title} → /catalog/files/${file}`);

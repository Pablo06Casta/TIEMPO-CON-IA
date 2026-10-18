import { strToU8, zipSync } from "fflate";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
export const MAX_SKILLS = 20;

export function slug(text) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 64).replace(/-$/, "") || "complemento";
}

export function buildComplementZip({ title, description = "", skills }) {
  const cleanTitle = title?.trim();
  if (!cleanTitle || cleanTitle.length > 80) throw new Error("Escribe un nombre de hasta 80 caracteres.");
  if (!Array.isArray(skills) || skills.length < 2)
    throw new Error("Selecciona al menos dos skills.");
  if (skills.length > MAX_SKILLS)
    throw new Error(`Puedes incluir hasta ${MAX_SKILLS} skills en un complemento.`);

  const total = skills.reduce((sum, skill) => {
    if (!Array.isArray(skill.files) || skill.files.length === 0)
      throw new Error(`La skill ${skill.title || "sin título"} no tiene archivos descargables.`);
    for (const file of skill.files) {
      if (!(file.bytes instanceof Uint8Array) || file.bytes.length > MAX_FILE_BYTES)
        throw new Error(`Archivo inválido o demasiado grande: ${file.name || skill.title}`);
      sum += file.bytes.length;
    }
    return sum;
  }, 0);
  if (total > MAX_TOTAL_BYTES) throw new Error("El complemento supera el límite de 80 MB.");

  const files = {};
  const entries = skills.map((skill, index) => {
    const directory = `skills/${String(index + 1).padStart(2, "0")}-${slug(skill.title || "skill")}`;
    const usedNames = new Set();
    const attachments = skill.files.map((file, fileIndex) => {
      const original = String(file.name || "archivo").split(/[\\/]/).at(-1);
      const safeName = original.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^\.+/, "") || "archivo";
      let name = safeName;
      let suffix = fileIndex + 1;
      while (usedNames.has(name)) name = `${suffix++}-${safeName}`;
      usedNames.add(name);
      const path = `${directory}/${name}`;
      files[path] = file.bytes;
      return { source: original, path };
    });
    return { title: skill.title || "Skill", files: attachments };
  });
  const manifest = {
    format: "tiempo-con-ia-complemento-v1",
    title: cleanTitle,
    description: description.trim().slice(0, 240),
    skills: entries,
  };
  files["complemento.json"] = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
  files["LEEME.txt"] = strToU8(
    `${cleanTitle}\n\nEste ZIP reúne ${entries.length} skills. Abre la carpeta skills para ver los archivos. ` +
    "Si una skill original era un ZIP, se conserva como ZIP dentro de su carpeta. " +
    "Instala o importa cada skill siguiendo las instrucciones de la herramienta donde vayas a usarla.\n",
  );
  return { filename: `${slug(cleanTitle)}.zip`, bytes: zipSync(files, { level: 1 }) };
}

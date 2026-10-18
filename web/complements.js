import { buildComplementZip, MAX_FILE_BYTES } from "./complements-core.js";

const publicCatalogUrl = "https://tiempo-con-ia-catalogo-20261018.pablocastenda.chatgpt.site/api/resources";
const list = document.querySelector("#complement-list");
const skillList = document.querySelector("#complement-skill-list");
const localList = document.querySelector("#complement-local-list");
const form = document.querySelector("#complement-builder");
const titleInput = document.querySelector("#complement-title");
const descriptionInput = document.querySelector("#complement-description");
const filesInput = document.querySelector("#complement-files");
const count = document.querySelector("#complement-count");
const status = document.querySelector("#complement-status");
let skills = [];
let complements = [];
let localFiles = [];
let busy = false;
let complementsLoadFailed = false;

function message(container, text) {
  const paragraph = document.createElement("p");
  paragraph.className = "catalog-message";
  paragraph.textContent = text;
  container.replaceChildren(paragraph);
}

function setStatus(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}

function selectedSkills() {
  const ids = new Set([...skillList.querySelectorAll("input:checked")].map((input) => input.value));
  return skills.filter((skill) => ids.has(skill.id || skill.file));
}

function updateCount() {
  const total = selectedSkills().length + localFiles.length;
  count.textContent = `${total} ${total === 1 ? "skill seleccionada" : "skills seleccionadas"}`;
}

function renderSkillPicker() {
  const selected = new Set([...skillList.querySelectorAll("input:checked")].map((input) => input.value));
  if (!skills.length) {
    message(skillList, "Aún no hay skills publicadas. Puedes añadir dos archivos propios abajo para crear tu complemento.");
    updateCount();
    return;
  }
  skillList.replaceChildren(...skills.map((skill) => {
    const label = document.createElement("label");
    label.className = "complement-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = skill.id || skill.file;
    checkbox.checked = selected.has(checkbox.value);
    checkbox.addEventListener("change", updateCount);
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = skill.title;
    const description = document.createElement("small");
    description.textContent = skill.description || (skill.source === "live" ? "Publicada desde el estudio" : "Skill de la biblioteca");
    copy.append(title, description);
    label.append(checkbox, copy);
    return label;
  }));
  updateCount();
}

function renderLocalFiles() {
  localList.replaceChildren(...localFiles.map((file) => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Quitar";
    remove.setAttribute("aria-label", `Quitar ${file.name}`);
    remove.addEventListener("click", () => {
      localFiles = localFiles.filter((item) => item !== file);
      renderLocalFiles();
    });
    row.append(name, remove);
    return row;
  }));
  updateCount();
}

async function fetchBytes(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${label}.`);
  if (Number(response.headers.get("content-length")) > MAX_FILE_BYTES)
    throw new Error(`El archivo ${label} supera los 20 MB.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) throw new Error(`El archivo ${label} supera los 20 MB.`);
  return bytes;
}

async function loadSkill(skill) {
  if (skill.source === "static") {
    return { title: skill.title, files: [{
      name: skill.file,
      bytes: await fetchBytes(`/catalog/files/${encodeURIComponent(skill.file)}`, skill.title),
    }] };
  }
  const detailResponse = await fetch(`${publicCatalogUrl}/${encodeURIComponent(skill.id)}`, { cache: "no-store" });
  if (!detailResponse.ok) throw new Error(`La skill ${skill.title} ya no está disponible.`);
  const detail = (await detailResponse.json()).resource;
  if (!detail || detail.kind !== "skill") throw new Error(`La skill ${skill.title} ya no está publicada.`);
  const files = [];
  if (detail.content?.trim()) {
    const bytes = new TextEncoder().encode(detail.content);
    files.push({ name: "SKILL.md", bytes });
  }
  for (const attachment of detail.files || []) {
    files.push({
      name: attachment.name,
      bytes: await fetchBytes(`${publicCatalogUrl}/${encodeURIComponent(skill.id)}/files/${encodeURIComponent(attachment.id)}`, attachment.name),
    });
  }
  if (!files.length) throw new Error(`La skill ${skill.title} no tiene contenido descargable.`);
  return { title: skill.title, files };
}

async function downloadComplement(title, description, published, own) {
  if (busy) return;
  if (published.length + own.length < 2) {
    setStatus("Selecciona al menos dos skills para crear el complemento.", true);
    return;
  }
  busy = true;
  form.querySelector('button[type="submit"]').disabled = true;
  setStatus("Preparando los archivos…");
  try {
    const loaded = await Promise.all(published.map(loadSkill));
    const uploaded = await Promise.all(own.map(async (file) => ({
      title: file.name.replace(/\.(md|txt|zip)$/i, ""),
      files: [{ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }],
    })));
    const zip = buildComplementZip({ title, description, skills: [...loaded, ...uploaded] });
    const url = URL.createObjectURL(new Blob([zip.bytes], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = zip.filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setStatus(`Descarga iniciada: ${zip.filename}`);
  } catch (error) {
    setStatus(error.message || "No se pudo crear el complemento.", true);
  } finally {
    busy = false;
    form.querySelector('button[type="submit"]').disabled = false;
  }
}

function complementCard(complement) {
  const article = document.createElement("article");
  article.className = "catalog-card";
  const top = document.createElement("div");
  top.className = "catalog-card-top";
  top.textContent = `COMPLEMENTO · ${complement.skills.length} SKILLS`;
  const title = document.createElement("h3");
  title.textContent = complement.title;
  const description = document.createElement("p");
  description.textContent = complement.description;
  const included = complement.skills.map((id) => skills.find((item) => item.id === id)).filter(Boolean);
  const names = document.createElement("div");
  names.className = "complement-card-names";
  names.textContent = included.length === complement.skills.length
    ? included.map((item) => item.title).join(" · ")
    : "Algunas skills de este complemento no están disponibles ahora.";
  const actions = document.createElement("div");
  actions.className = "complement-card-actions";
  const configure = document.createElement("button");
  configure.type = "button";
  configure.textContent = "Configurar ↗";
  configure.addEventListener("click", () => {
    titleInput.value = complement.title;
    descriptionInput.value = complement.description;
    const ids = new Set(complement.skills);
    for (const input of skillList.querySelectorAll("input")) input.checked = ids.has(input.value);
    updateCount();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    titleInput.focus({ preventScroll: true });
  });
  const download = document.createElement("button");
  download.type = "button";
  download.textContent = "Descargar ZIP ↓";
  download.disabled = included.length !== complement.skills.length;
  download.addEventListener("click", () => downloadComplement(complement.title, complement.description, included, []));
  actions.append(configure, download);
  article.append(top, title, description, names, actions);
  return article;
}

function renderComplements() {
  if (complements.length) list.replaceChildren(...complements.map(complementCard));
  else if (complementsLoadFailed) message(list, "Los complementos publicados no están disponibles ahora. Puedes crear el tuyo abajo.");
  else message(list, "Pronto habrá complementos preparados. Mientras tanto, crea uno con tus propias skills abajo.");
}

filesInput.addEventListener("change", () => {
  const selected = [...filesInput.files];
  const invalid = selected.find((file) => !/\.(md|txt|zip)$/i.test(file.name) || file.size > MAX_FILE_BYTES);
  if (invalid) setStatus(`Archivo no admitido o mayor de 20 MB: ${invalid.name}`, true);
  else {
    for (const file of selected) {
      if (!localFiles.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified))
        localFiles.push(file);
    }
    setStatus("Archivos añadidos. Selecciona al menos dos skills en total.");
  }
  filesInput.value = "";
  renderLocalFiles();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  downloadComplement(titleInput.value, descriptionInput.value, selectedSkills(), localFiles);
});

async function loadSkills() {
  const [staticResult, liveResult] = await Promise.allSettled([
    fetch("/catalog/catalog.json", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Catálogo estático no disponible");
      return response.json();
    }),
    fetch(publicCatalogUrl, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Catálogo del estudio no disponible");
      return (await response.json()).resources;
    }),
  ]);
  const staticSkills = staticResult.status === "fulfilled" && Array.isArray(staticResult.value)
    ? staticResult.value.filter((item) => item.kind === "skill").map((item) => ({ ...item, source: "static" })) : [];
  const liveSkills = liveResult.status === "fulfilled" && Array.isArray(liveResult.value)
    ? liveResult.value.filter((item) => item.kind === "skill").map((item) => ({ ...item, source: "live" })) : [];
  if (staticResult.status === "rejected" && liveResult.status === "rejected") {
    setStatus("No se pudieron cargar las skills publicadas. Puedes usar archivos propios.", true);
    return;
  }
  skills = [...liveSkills, ...staticSkills];
  renderSkillPicker();
  renderComplements();
  if (liveResult.status === "rejected" && !staticSkills.length)
    setStatus("No se pudieron cargar las skills del estudio. Puedes usar archivos propios.", true);
}

async function loadComplements() {
  try {
    const response = await fetch("/catalog/complements.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Complementos no disponibles");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Complementos inválidos");
    complements = data;
    complementsLoadFailed = false;
    renderComplements();
  } catch {
    complementsLoadFailed = true;
    renderComplements();
  }
}

await Promise.all([loadSkills(), loadComplements()]);
document.addEventListener("visibilitychange", () => { if (!document.hidden) loadSkills().catch(() => {}); });

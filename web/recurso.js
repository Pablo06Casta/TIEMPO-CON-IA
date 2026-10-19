import { downloadFileParts } from './download-file.js';

const publicCatalogUrl = "https://tiempo-con-ia-catalogo-20261018.pablocastenda.chatgpt.site/api/resources";
const labels = { prompt: "PROMPT SIMPLE", skill: "SKILL", agent: "AGENTE", agente: "AGENTE", automatizacion: "AUTOMATIZACIÓN", otro: "RECURSO", complement: "COMPLEMENTO" };
const loading = document.querySelector("#resource-loading");
const detail = document.querySelector("#resource-detail");
const instructions = document.querySelector("#resource-instructions");
const copyButton = document.querySelector("#copy-instructions");
const copyStatus = document.querySelector("#copy-status");
let instructionText = "";

function fileLink(name, href, size, download = false) {
  const link = document.createElement("a");
  link.className = "resource-file";
  link.href = href;
  if (download) link.download = name;
  const label = document.createElement("strong");
  label.textContent = name;
  const meta = document.createElement("span");
  meta.textContent = size ? `${size < 1048576 ? Math.max(1, Math.ceil(size / 1024)) + " KB" : (size / 1048576).toFixed(1) + " MB"} · Descargar ↓` : "Descargar ↓";
  link.append(label, meta);
  return link;
}

function chunkedFileButton(file) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "resource-file";
  const label = document.createElement("strong");
  label.textContent = file.name;
  const meta = document.createElement("span");
  meta.textContent = `${(file.size / 1048576).toFixed(1)} MB · Descargar ↓`;
  button.append(label, meta);
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await downloadFileParts(file, (current, total) => { meta.textContent = `Descargando ${current}/${total}…`; });
      meta.textContent = "Descarga preparada ↓";
    } catch (error) {
      meta.textContent = error.message + " Reintentar ↓";
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

async function loadResource() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const file = params.get("file");
  if (Boolean(id) === Boolean(file)) throw new Error("No se ha indicado un recurso válido.");
  if (id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("El enlace del recurso no es válido.");
    const localResponse = await fetch('/catalog/live.json', { cache: 'no-store' });
    if (localResponse.ok) {
      const local = await localResponse.json();
      if (local.migrated === true) {
        const resource = local.resources?.find(item => item.id === id);
        if (!resource) throw new Error('Este recurso ya no está publicado.');
        return { ...resource, kind: resource.kind === 'agent' ? 'agente' : resource.kind, source: 'live', local: true };
      }
    }
    const response = await fetch(`${publicCatalogUrl}/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 404 ? "Este recurso ya no está publicado." : "No se pudo cargar el recurso. Inténtalo de nuevo.");
    const resource = (await response.json()).resource;
    if (!resource) throw new Error("No se encontró el recurso.");
    return { ...resource, kind: resource.kind === "agent" ? "agente" : resource.kind, source: "live" };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(txt|md|zip)$/.test(file)) throw new Error("El enlace del recurso no es válido.");
  const response = await fetch("/catalog/catalog.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el catálogo.");
  const catalog = await response.json();
  const resource = Array.isArray(catalog) && catalog.find(item => item.file === file);
  if (!resource) throw new Error("Este recurso ya no está publicado.");
  let content = resource.instructions || "";
  if (!content && /\.(txt|md)$/i.test(file)) {
    const contentResponse = await fetch(`/catalog/files/${encodeURIComponent(file)}`, { cache: "no-store" });
    if (contentResponse.ok) content = await contentResponse.text();
  }
  return { ...resource, content, source: "static" };
}

function render(resource) {
  document.title = `${resource.title} · TIEMPO CON IA`;
  document.querySelector("#resource-kind").textContent = labels[resource.kind] || "RECURSO";
  document.querySelector("#resource-title").textContent = resource.title;
  document.querySelector("#resource-description").textContent = resource.description || "Sin descripción.";
  const resultSummary = document.querySelector("#resource-result-summary");
  resultSummary.textContent = resource.result_description || resource.description || "Consulta las instrucciones y los archivos para conocer lo que puedes conseguir.";
  resultSummary.hidden = !!resource.cover_file_id;
  document.querySelector("#resource-result-note").textContent = resource.cover_file_id
    ? "La imagen es un ejemplo de resultado aportado con este recurso. Tu resultado dependerá de los datos y de la revisión."
    : "Aún no hay una imagen de ejemplo publicada.";
  const tags = document.querySelector("#resource-tags");
  tags.replaceChildren(...(resource.tags || []).map(tag => {
    const item = document.createElement("span");
    item.textContent = `#${tag}`;
    return item;
  }));
  const cover = document.querySelector("#resource-cover");
  if (resource.source === "live" && resource.cover_file_id) {
    const image = document.querySelector("#resource-cover-image");
    image.src = resource.files?.find(file => file.id === resource.cover_file_id)?.url || `${publicCatalogUrl}/${encodeURIComponent(resource.id)}/cover`;
    image.alt = `Resultado de ${resource.title}`;
    image.onerror = () => { cover.hidden = true; resultSummary.hidden = false; };
    document.querySelector("#resource-cover-caption").textContent = resource.result_description || "Así queda el resultado al usar este recurso.";
    cover.hidden = false;
  }
  instructionText = resource.content || "";
  instructions.textContent = instructionText || "Este recurso no incluye instrucciones en texto.";
  copyButton.disabled = !instructionText;
  const files = document.querySelector("#resource-files");
  files.replaceChildren();
  if (resource.source === "live") {
    if (instructionText) files.append(fileLink("instrucciones.txt", resource.local ? URL.createObjectURL(new Blob([instructionText], { type: 'text/plain;charset=utf-8' })) : `${publicCatalogUrl}/${encodeURIComponent(resource.id)}/instrucciones.txt`, undefined, resource.local));
    for (const file of resource.files || []) files.append(Array.isArray(file.parts) && file.parts.length
      ? chunkedFileButton(file)
      : fileLink(file.name, file.url || `${publicCatalogUrl}/${encodeURIComponent(resource.id)}/files/${encodeURIComponent(file.id)}`, file.size, !!file.url));
  } else {
    files.append(fileLink(resource.file, `/catalog/files/${encodeURIComponent(resource.file)}`));
  }
  if (!files.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "resource-empty";
    empty.textContent = "Este recurso no tiene archivos adjuntos publicados.";
    files.append(empty);
  }
  loading.hidden = true;
  detail.hidden = false;
  if (location.hash === "#resultado") requestAnimationFrame(() => document.querySelector("#resultado").scrollIntoView({ block: "start" }));
}

copyButton.addEventListener("click", async () => {
  if (!instructionText) return;
  try {
    await navigator.clipboard.writeText(instructionText);
    copyStatus.textContent = "Instrucciones copiadas.";
  } catch {
    const input = document.createElement("textarea");
    input.value = instructionText;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch {}
    input.remove();
    copyStatus.textContent = copied ? "Instrucciones copiadas." : "No se pudo copiar. Selecciona el texto para copiarlo.";
  }
});

loadResource().then(render).catch(error => {
  loading.textContent = error instanceof Error ? error.message : "No se pudo cargar el recurso.";
});

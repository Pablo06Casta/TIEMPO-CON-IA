const list = document.querySelector("#catalog-list");
const kinds = {
  prompt: "PROMPT",
  skill: "SKILL",
  agente: "AGENTE",
  automatización: "AUTOMATIZACIÓN",
  otro: "RECURSO",
};

function message(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "catalog-message";
  paragraph.textContent = text;
  list.replaceChildren(paragraph);
}

function card(resource) {
  const article = document.createElement("article");
  article.className = "catalog-card";

  const top = document.createElement("div");
  top.className = "catalog-card-top";
  const kind = document.createElement("span");
  kind.className = "catalog-kind";
  kind.textContent = kinds[resource.kind] || kinds.otro;
  const extension = document.createElement("span");
  extension.className = "catalog-extension";
  extension.textContent = resource.file.includes(".")
    ? resource.file.split(".").at(-1).toUpperCase()
    : "ARCHIVO";
  top.append(kind, extension);

  const title = document.createElement("h3");
  title.textContent = resource.title;
  const description = document.createElement("p");
  description.textContent = resource.description;
  const download = document.createElement("a");
  download.className = "catalog-download";
  download.href = resource.id
    ? `/api/download?id=${encodeURIComponent(resource.id)}`
    : `/catalog/files/${encodeURIComponent(resource.file)}`;
  if (!resource.id) download.download = resource.file;
  download.textContent = "Descargar archivo ↗";

  article.append(top, title, description, download);
  return article;
}

async function loadStatic() {
  const response = await fetch("/catalog/catalog.json");
  if (!response.ok) throw new Error("No se pudo cargar el catálogo estático");
  const resources = await response.json();
  if (!Array.isArray(resources)) throw new Error("Catálogo estático inválido");
  return resources;
}

async function loadNotion() {
  const response = await fetch("/api/catalog");
  if (!response.ok) throw new Error("No se pudo cargar Notion");
  const result = await response.json();
  if (!Array.isArray(result.resources))
    throw new Error("Respuesta de Notion inválida");
  return result.resources;
}

const [staticResult, notionResult] = await Promise.allSettled([
  loadStatic(),
  loadNotion(),
]);
const staticResources =
  staticResult.status === "fulfilled" ? staticResult.value : [];
const notionResources =
  notionResult.status === "fulfilled" ? notionResult.value : [];
const resources = [...notionResources, ...staticResources];
if (resources.length) {
  list.replaceChildren(...resources.map(card));
} else if (
  staticResult.status === "rejected" ||
  notionResult.status === "rejected"
) {
  message("La biblioteca no está disponible ahora. Inténtalo más tarde.");
} else {
  message("Estamos preparando los primeros recursos. Vuelve pronto.");
}

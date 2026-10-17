const list = document.querySelector("#catalog-list");
const labels = {
  prompt: "PROMPT",
  skill: "SKILL",
  agente: "AGENTE",
  automatizacion: "AUTOMATIZACIÓN",
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
  kind.textContent = labels[resource.kind] || labels.otro;
  const extension = document.createElement("span");
  extension.className = "catalog-extension";
  extension.textContent = resource.file.split(".").at(-1).toUpperCase();
  top.append(kind, extension);

  const title = document.createElement("h3");
  title.textContent = resource.title;
  const description = document.createElement("p");
  description.textContent = resource.description;
  const download = document.createElement("a");
  download.className = "catalog-download";
  download.href = `/catalog/files/${encodeURIComponent(resource.file)}`;
  download.download = resource.file;
  download.textContent = "Descargar archivo ↗";

  article.append(top, title, description, download);
  return article;
}

try {
  const response = await fetch("/catalog/catalog.json");
  if (!response.ok) throw new Error("No se pudo cargar el catálogo");
  const resources = await response.json();
  if (!Array.isArray(resources)) throw new Error("Catálogo inválido");
  if (resources.length === 0) {
    message("Estamos preparando los primeros recursos. Vuelve pronto.");
  } else {
    list.replaceChildren(...resources.map(card));
  }
} catch {
  message("La biblioteca no está disponible ahora. Inténtalo más tarde.");
}

const list = document.querySelector("#catalog-list");
const search = document.querySelector("#catalog-search");
const tagSelect = document.querySelector("#catalog-tag");
const clearButton = document.querySelector("#catalog-clear");
const resultCount = document.querySelector("#catalog-results");
const groupButtons = [...document.querySelectorAll("[data-catalog-group]")];
const publicCatalogUrl = "https://tiempo-con-ia-catalogo-20261018.pablocastenda.chatgpt.site/api/resources";

const groups = [
  { id: "prompt", title: "Prompts simples", description: "Instrucciones listas para copiar y adaptar.", kinds: ["prompt"] },
  { id: "skill", title: "Skills", description: "Instrucciones y archivos para tareas más completas.", kinds: ["skill"] },
  { id: "otros", title: "Otros recursos", description: "Agentes, automatizaciones y otros materiales.", kinds: ["agente", "automatizacion", "otro"] },
];
const labels = {
  prompt: "PROMPT SIMPLE",
  skill: "SKILL",
  agente: "AGENTE",
  automatizacion: "AUTOMATIZACIÓN",
  otro: "RECURSO",
};

let resources = [];
let selectedGroup = "";

function groupOf(resource) {
  return groups.find((group) => group.kinds.includes(resource.kind));
}

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
  extension.textContent = resource.source === "live" ? "PUBLICADO" : resource.file.split(".").at(-1).toUpperCase();
  top.append(kind, extension);

  const title = document.createElement("h3");
  title.textContent = resource.title;
  const description = document.createElement("p");
  description.textContent = resource.description;
  const tags = document.createElement("div");
  tags.className = "catalog-tags";
  for (const tag of resource.tags || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `#${tag}`;
    button.setAttribute("aria-label", `Filtrar por etiqueta ${tag}`);
    button.addEventListener("click", () => {
      tagSelect.value = [...tagSelect.options].find((option) => option.value.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"))?.value || "";
      render();
    });
    tags.append(button);
  }
  const open = document.createElement("a");
  open.className = "catalog-open";
  open.href = resource.source === "live"
    ? `/recurso.html?id=${encodeURIComponent(resource.id)}`
    : `/recurso.html?file=${encodeURIComponent(resource.file)}`;
  open.textContent = "Abrir recurso ↗";
  open.setAttribute("aria-label", `Abrir ${resource.title}`);
  if (resource.source === "live" && resource.cover_file_id) {
    const figure = document.createElement("figure");
    figure.className = "catalog-cover";
    const img = document.createElement("img");
    img.src = `${publicCatalogUrl}/${encodeURIComponent(resource.id)}/cover`;
    img.alt = `Resultado de ${resource.title}`;
    img.loading = "lazy";
    img.addEventListener("error", () => figure.remove());
    figure.append(img);
    if (resource.result_description) {
      const caption = document.createElement("figcaption");
      caption.textContent = resource.result_description;
      figure.append(caption);
    }
    article.append(figure);
  }
  article.append(top, title, description, tags, open);
  return article;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase("es");
  const selectedTag = tagSelect.value.toLocaleLowerCase("es");
  const filtered = resources.filter((resource) => {
    const tags = resource.tags || [];
    return (!selectedGroup || groupOf(resource)?.id === selectedGroup)
      && (!selectedTag || tags.some((tag) => tag.toLocaleLowerCase("es") === selectedTag))
      && (!query || `${resource.title} ${resource.description} ${labels[resource.kind]} ${tags.join(" ")}`.toLocaleLowerCase("es").includes(query));
  });
  const hasFilters = Boolean(selectedGroup || query || selectedTag);
  clearButton.hidden = !hasFilters;
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "recurso" : "recursos"}${hasFilters ? " encontrados" : " en la biblioteca"}`;
  for (const button of groupButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.catalogGroup === selectedGroup));
  }
  if (hasFilters && filtered.length === 0) {
    message("No hay recursos con estos filtros. Prueba otra búsqueda o etiqueta.");
    return;
  }
  const sections = groups.filter((group) => (!selectedGroup || group.id === selectedGroup) && (!hasFilters || filtered.some((resource) => groupOf(resource)?.id === group.id))).map((group) => {
    const section = document.createElement("section");
    section.className = "catalog-group";
    section.setAttribute("aria-label", group.title);
    const heading = document.createElement("div");
    heading.className = "catalog-group-heading";
    const title = document.createElement("h3");
    title.textContent = group.title;
    const description = document.createElement("p");
    description.textContent = group.description;
    const count = document.createElement("span");
    const items = filtered.filter((resource) => groupOf(resource)?.id === group.id);
    count.textContent = String(items.length);
    heading.append(title, description, count);
    const grid = document.createElement("div");
    grid.className = "catalog-grid";
    if (items.length) grid.append(...items.map(card));
    else if (!hasFilters) {
      const empty = document.createElement("p");
      empty.className = "catalog-message";
      empty.textContent = "Próximamente habrá recursos en esta sección.";
      grid.append(empty);
    }
    section.append(heading, grid);
    return section;
  });
  list.replaceChildren(...sections);
}

for (const button of groupButtons) {
  button.addEventListener("click", () => {
    selectedGroup = selectedGroup === button.dataset.catalogGroup ? "" : button.dataset.catalogGroup;
    render();
  });
}
search.addEventListener("input", render);
tagSelect.addEventListener("change", render);
clearButton.addEventListener("click", () => {
  selectedGroup = "";
  search.value = "";
  tagSelect.value = "";
  render();
});

async function refreshCatalog() {
  const [staticResult, liveResult] = await Promise.allSettled([
    fetch("/catalog/catalog.json", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Catálogo no disponible");
      return response.json();
    }),
    fetch(publicCatalogUrl, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Catálogo no disponible");
      return (await response.json()).resources;
    })
  ]);
  const staticResources = staticResult.status === "fulfilled" && Array.isArray(staticResult.value) ? staticResult.value : [];
  const liveResources = liveResult.status === "fulfilled" && Array.isArray(liveResult.value) ? liveResult.value.map(resource => ({
    ...resource, kind: resource.kind === "agent" ? "agente" : resource.kind, source: "live"
  })) : [];
  if (staticResult.status === "rejected" && liveResult.status === "rejected") throw new Error("Catálogo no disponible");
  resources = [...liveResources, ...staticResources];
  const selectedTag = tagSelect.value;
  tagSelect.replaceChildren(new Option("Todas las etiquetas", ""));
  const tags = [...new Map(resources.flatMap((resource) => resource.tags || [])
    .map((tag) => [tag.toLocaleLowerCase("es"), tag])).values()].sort((a, b) => a.localeCompare(b, "es"));
  tagSelect.append(...tags.map((tag) => new Option(`#${tag}`, tag)));
  tagSelect.value = tags.includes(selectedTag) ? selectedTag : "";
  for (const group of groups) {
    const count = resources.filter((resource) => groupOf(resource)?.id === group.id).length;
    document.querySelector(`[data-catalog-count="${group.id}"]`).textContent = `${count} ${count === 1 ? "recurso" : "recursos"}`;
  }
  render();
}
refreshCatalog().catch(() => {
  resultCount.textContent = "";
  message("La biblioteca no está disponible ahora. Inténtalo más tarde.");
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshCatalog().catch(() => {}); });
setInterval(() => { if (!document.hidden) refreshCatalog().catch(() => {}); }, 30000);

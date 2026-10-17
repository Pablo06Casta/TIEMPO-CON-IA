const API = "https://api.notion.com/v1";
const VERSION = "2025-09-03";

export function normalizeId(value) {
  if (!value) return null;
  let candidate = value.trim();
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      candidate =
        new URL(candidate).pathname.split("/").filter(Boolean).at(-1) || "";
    } catch {
      return null;
    }
  }
  const match = candidate.match(/([a-f0-9]{32})$/i);
  if (match) return match[1].toLowerCase();
  const compact = candidate.replaceAll("-", "");
  return /^[a-f0-9]{32}$/i.test(compact) ? compact.toLowerCase() : null;
}

export function notionConfigured() {
  return Boolean(
    process.env.NOTION_TOKEN && normalizeId(process.env.NOTION_DATABASE_ID),
  );
}

async function notion(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    signal: AbortSignal.timeout(8_000),
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`Notion devolvió HTTP ${response.status}`);
  return response.json();
}

let cachedSource;

export async function sourceIds() {
  const databaseId = normalizeId(process.env.NOTION_DATABASE_ID);
  if (!process.env.NOTION_TOKEN || !databaseId)
    throw new Error("Notion no está configurado");
  const specifiedSource = normalizeId(process.env.NOTION_DATA_SOURCE_ID);
  if (specifiedSource) return { databaseId, dataSourceId: specifiedSource };
  if (
    cachedSource?.databaseId === databaseId &&
    cachedSource.expires > Date.now()
  )
    return cachedSource;

  const database = await notion(`/databases/${databaseId}`);
  const sources = database.data_sources || [];
  if (sources.length !== 1)
    throw new Error(
      "La base de datos debe tener una sola fuente de datos, o configurar NOTION_DATA_SOURCE_ID",
    );
  cachedSource = {
    databaseId,
    dataSourceId: normalizeId(sources[0].id),
    expires: Date.now() + 300_000,
  };
  return cachedSource;
}

function plainText(richText) {
  return Array.isArray(richText)
    ? richText
        .map((part) => part.plain_text || part.text?.content || "")
        .join("")
    : "";
}

export function publicResource(page) {
  const properties = page.properties || {};
  if (page.archived || page.in_trash || properties.Publicar?.checkbox !== true)
    return null;
  const titleProperty = Object.values(properties).find(
    (property) => property.type === "title",
  );
  const title = plainText(titleProperty?.title).trim();
  const description = plainText(properties["Descripción"]?.rich_text).trim();
  const file = properties.Archivo?.files?.[0];
  const fileUrl = file?.file?.url || file?.external?.url;
  if (!title || !file?.name || !fileUrl) return null;
  try {
    if (new URL(fileUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }
  const kind = properties.Tipo?.select?.name?.trim().toLowerCase() || "otro";
  const kinds = {
    prompt: "prompt",
    skill: "skill",
    agente: "agente",
    automatización: "automatización",
    automatizacion: "automatización",
  };
  return {
    id: page.id,
    kind: kinds[kind] || "otro",
    title,
    description: description || "Recurso disponible para descargar.",
    file: file.name,
    fileUrl,
  };
}

export async function publishedResources() {
  const { dataSourceId } = await sourceIds();
  const resources = [];
  let cursor;
  let pagesRead = 0;
  do {
    const response = await notion(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        filter: { property: "Publicar", checkbox: { equals: true } },
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    for (const page of response.results || []) {
      const resource = publicResource(page);
      if (resource) {
        const { fileUrl, ...safe } = resource;
        resources.push(safe);
      }
    }
    cursor = response.has_more ? response.next_cursor : null;
    pagesRead += 1;
  } while (cursor && pagesRead < 5);
  return resources;
}

export async function downloadableResource(pageId) {
  const { databaseId, dataSourceId } = await sourceIds();
  const page = await notion(`/pages/${pageId}`);
  const parentId = normalizeId(
    page.parent?.data_source_id || page.parent?.database_id,
  );
  if (parentId !== dataSourceId && parentId !== databaseId) return null;
  return publicResource(page);
}

import {
  downloadableResource,
  normalizeId,
  notionConfigured,
} from "../lib/notion.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).end();
  }
  const pageId = normalizeId(String(request.query.id || ""));
  if (!notionConfigured() || !pageId) return response.status(404).end();
  try {
    const resource = await downloadableResource(pageId);
    if (!resource) return response.status(404).end();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Location", resource.fileUrl);
    return response.status(302).end();
  } catch (error) {
    console.error("No se pudo preparar la descarga:", error);
    return response.status(502).end();
  }
}

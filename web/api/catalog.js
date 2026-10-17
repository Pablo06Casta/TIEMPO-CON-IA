import { notionConfigured, publishedResources } from "../lib/notion.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Método no permitido" });
  }
  if (!notionConfigured())
    return response.status(200).json({ configured: false, resources: [] });
  try {
    const resources = await publishedResources();
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60",
    );
    return response.status(200).json({ configured: true, resources });
  } catch (error) {
    console.error("No se pudo cargar Notion:", error);
    return response
      .status(502)
      .json({ error: "No se pudo cargar la biblioteca" });
  }
}

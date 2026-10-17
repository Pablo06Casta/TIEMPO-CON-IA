import test from "node:test";
import assert from "node:assert/strict";
import {
  downloadableResource,
  normalizeId,
  publicResource,
  publishedResources,
} from "../lib/notion.js";

const databaseId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const sourceId = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const pageId = "cccccccccccccccccccccccccccccccc";

function page(overrides = {}) {
  return {
    id: pageId,
    parent: { data_source_id: sourceId },
    properties: {
      Nombre: { type: "title", title: [{ plain_text: "Guía de reuniones" }] },
      Tipo: { select: { name: "Skill" } },
      Descripción: { rich_text: [{ plain_text: "Resume reuniones." }] },
      Archivo: {
        files: [
          {
            name: "reuniones.zip",
            file: { url: "https://files.example.test/reuniones.zip" },
          },
        ],
      },
      Publicar: { checkbox: true },
    },
    ...overrides,
  };
}

test("extrae el ID de un enlace de Notion sin confundirlo con el ID de la vista", () => {
  assert.equal(
    normalizeId(`https://www.notion.so/Recursos-${databaseId}?v=${sourceId}`),
    databaseId,
  );
});

test("oculta borradores y páginas eliminadas", () => {
  assert.equal(
    publicResource(
      page({
        properties: { ...page().properties, Publicar: { checkbox: false } },
      }),
    ),
    null,
  );
  assert.equal(publicResource(page({ in_trash: true })), null);
});

test("la lista pública excluye enlaces privados de Notion", async () => {
  process.env.NOTION_TOKEN = "token-de-prueba";
  process.env.NOTION_DATABASE_ID = databaseId;
  process.env.NOTION_DATA_SOURCE_ID = sourceId;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ results: [page()], has_more: false }),
  });
  try {
    const resources = await publishedResources();
    assert.equal(resources.length, 1);
    assert.equal(resources[0].title, "Guía de reuniones");
    assert.equal("fileUrl" in resources[0], false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("la descarga rechaza una página de otra base de datos", async () => {
  process.env.NOTION_TOKEN = "token-de-prueba";
  process.env.NOTION_DATABASE_ID = databaseId;
  process.env.NOTION_DATA_SOURCE_ID = sourceId;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () =>
      page({ parent: { data_source_id: "dddddddddddddddddddddddddddddddd" } }),
  });
  try {
    assert.equal(await downloadableResource(pageId), null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

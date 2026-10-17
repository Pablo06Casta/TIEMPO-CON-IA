import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../api/catalog.js";
import download from "../api/download.js";

function response() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

test("sin configurar Notion, la web conserva el catálogo estático", async () => {
  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DATABASE_ID;
  const result = response();
  await catalog({ method: "GET" }, result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { configured: false, resources: [] });
});

test("sin configurar Notion, no hay descargas dinámicas", async () => {
  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DATABASE_ID;
  const result = response();
  await download(
    { method: "GET", query: { id: "cccccccccccccccccccccccccccccccc" } },
    result,
  );
  assert.equal(result.statusCode, 404);
});

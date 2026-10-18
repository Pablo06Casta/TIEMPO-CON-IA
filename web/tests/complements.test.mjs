import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync } from "fflate";
import { buildComplementZip } from "../complements-core.js";

test("un complemento reúne skills distintas y conserva los archivos originales", () => {
  const originalZip = strToU8("contenido binario de prueba");
  const result = buildComplementZip({
    title: "Trabajo con IA",
    description: "Dos habilidades",
    skills: [
      { title: "Redacción", files: [
        { name: "SKILL.md", bytes: strToU8("# Redacción") },
        { name: "ejemplos.txt", bytes: strToU8("Ejemplo") },
      ] },
      { title: "Análisis", files: [{ name: "analisis.zip", bytes: originalZip }] },
    ],
  });
  const files = unzipSync(result.bytes);
  const manifest = JSON.parse(strFromU8(files["complemento.json"]));
  assert.equal(result.filename, "trabajo-con-ia.zip");
  assert.equal(manifest.skills.length, 2);
  assert.equal(strFromU8(files[manifest.skills[0].files[0].path]), "# Redacción");
  assert.equal(strFromU8(files[manifest.skills[0].files[1].path]), "Ejemplo");
  assert.deepEqual(files[manifest.skills[1].files[0].path], originalZip);
  assert.match(strFromU8(files["LEEME.txt"]), /2 skills/);
});

test("el generador rechaza un complemento con una sola skill", () => {
  assert.throws(() => buildComplementZip({
    title: "Incompleto",
    skills: [{ title: "Una", files: [{ name: "una.md", bytes: strToU8("# Una") }] }],
  }), /al menos dos skills/);
});

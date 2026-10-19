import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadFileParts } from '../download-file.js';

test('published ZIP parts produce one downloadable archive in order', async () => {
  const previousFetch = globalThis.fetch;
  const previousDocument = globalThis.document;
  const previousTimeout = globalThis.setTimeout;
  const previousObjectUrl = URL.createObjectURL;
  let downloaded;
  let clicked = false;
  const progress = [];
  globalThis.fetch = async path => new Response(path.endsWith('01') ? 'PKa' : 'bc');
  globalThis.document = { body: { append() {} }, createElement: () => ({ click() { clicked = true; }, remove() {} }) };
  globalThis.setTimeout = () => 0;
  URL.createObjectURL = blob => { downloaded = blob; return 'blob:test'; };
  try {
    await downloadFileParts({ name: 'recurso.zip', size: 5, parts: ['/catalog/live-files/id/file.zip.part-01', '/catalog/live-files/id/file.zip.part-02'] }, (current, total) => progress.push([current, total]));
    assert.equal(clicked, true);
    assert.equal(await downloaded.text(), 'PKabc');
    assert.deepEqual(progress, [[1, 2], [2, 2]]);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.document = previousDocument;
    globalThis.setTimeout = previousTimeout;
    URL.createObjectURL = previousObjectUrl;
  }
});

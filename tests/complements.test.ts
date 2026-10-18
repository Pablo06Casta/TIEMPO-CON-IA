import test from 'node:test';
import assert from 'node:assert/strict';
import { complementInput, updatePublicComplements } from '../src/lib/complements';
import { publishComplement } from '../src/lib/complement-publisher';

test('a complement requires two distinct published skill IDs', () => {
  assert.equal(complementInput.safeParse({ title: 'Demo', description: 'Descripción', skillIds: ['skill-a', 'skill-b'] }).success, true);
  assert.equal(complementInput.safeParse({ title: 'Demo', description: 'Descripción', skillIds: ['skill-a', 'skill-a'] }).success, false);
  assert.equal(complementInput.safeParse({ title: 'Demo', description: 'Descripción', skillIds: ['skill-a'] }).success, false);
});

test('publishing updates one public preset without removing another', () => {
  const old = { id: 'old', title: 'Anterior', description: 'Antes', skills: ['a', 'b'] };
  const entry = { id: 'new', title: 'Nuevo', description: 'Ahora', skills: ['c', 'd'] };
  assert.deepEqual(updatePublicComplements([old], entry), [old, entry]);
  assert.deepEqual(updatePublicComplements([old, entry], { ...entry, title: 'Actualizado' }), [old, { ...entry, title: 'Actualizado' }]);
  assert.deepEqual(updatePublicComplements([old, entry], entry, true), [old]);
});

test('GitHub publisher writes the Vercel manifest with the current SHA', async () => {
  const previousToken = process.env.GITHUB_CONTENTS_TOKEN;
  process.env.GITHUB_CONTENTS_TOKEN = 'test-token';
  const previousFetch = globalThis.fetch;
  const calls: Array<{ method: string; url: string; body?: Record<string, string> }> = [];
  globalThis.fetch = async (input, init) => {
    const method = init?.method || 'GET';
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, string> : undefined;
    calls.push({ method, url, body });
    if (method === 'GET') return Response.json({ sha: 'current-sha', encoding: 'base64', content: Buffer.from('[]').toString('base64') });
    return Response.json({ content: { sha: 'next-sha' } });
  };
  try {
    await publishComplement({ id: 'mine', title: 'Mi complemento', description: 'Dos skills', skills: ['one', 'two'] });
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /complements\.json\?ref=main$/);
    assert.equal(calls[1].method, 'PUT');
    assert.equal(calls[1].body?.sha, 'current-sha');
    const manifest = JSON.parse(Buffer.from(calls[1].body!.content, 'base64').toString('utf8'));
    assert.deepEqual(manifest, [{ id: 'mine', title: 'Mi complemento', description: 'Dos skills', skills: ['one', 'two'] }]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.GITHUB_CONTENTS_TOKEN;
    else process.env.GITHUB_CONTENTS_TOKEN = previousToken;
  }
});

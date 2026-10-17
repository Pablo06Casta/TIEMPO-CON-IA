import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { hashPassword, verifyPassword } from '../src/lib/auth';
import { inspectSkillZip } from '../src/lib/skill-zip';

test('passwords are salted and checked safely', () => {
  const first = hashPassword('correct-horse-battery-staple');
  const second = hashPassword('correct-horse-battery-staple');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('correct-horse-battery-staple', first), true);
  assert.equal(verifyPassword('wrong', first), false);
});
test('skill ZIP import finds SKILL.md while retaining the ZIP separately', () => {
  const archive = zipSync({'demo/SKILL.md':new TextEncoder().encode('# Demo\nInstructions'), 'demo/assets/info.txt':new TextEncoder().encode('asset')});
  const result = inspectSkillZip(archive);
  assert.equal(result.title,'Demo');
  assert.match(result.content,/Instructions/);
});
test('unsafe skill ZIP paths are rejected', () => {
  const archive = zipSync({'../SKILL.md':new TextEncoder().encode('# Unsafe')});
  assert.throws(()=>inspectSkillZip(archive),/rutas/);
});

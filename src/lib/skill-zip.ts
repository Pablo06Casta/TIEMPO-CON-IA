import { unzipSync } from 'fflate';

export function inspectSkillZip(bytes: Uint8Array) {
  let count = 0, total = 0;
  const extracted = unzipSync(bytes, { filter: entry => {
    count++; total += entry.originalSize;
    const parts = entry.name.split('/');
    if (count > 500 || total > 100 * 1024 * 1024 || entry.name.startsWith('/') || entry.name.includes('\\') || parts.some(part => part === '..' || part === '.') || entry.name.includes('\0')) throw new Error('ZIP con rutas o tamaño no permitidos');
    const isSkill = entry.name === 'SKILL.md' || entry.name.endsWith('/SKILL.md');
    if (isSkill && entry.originalSize > 200000) throw new Error('SKILL.md demasiado grande');
    return isSkill;
  }});
  const names = Object.keys(extracted);
  if (names.length !== 1) throw new Error('El ZIP debe contener un único SKILL.md');
  const content = new TextDecoder('utf-8', { fatal: true }).decode(extracted[names[0]]);
  if (!content.trim() || content.length > 200000) throw new Error('SKILL.md vacío o demasiado grande');
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim().slice(0,160) || names[0].split('/').at(-2) || 'Skill importada';
  return { title, content, path: names[0] };
}

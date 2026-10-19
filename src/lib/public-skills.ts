import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type PublishedSkill = { id: string; title: string; description: string; source: 'GitHub' | 'Estudio' };

const staticCatalogUrl = 'https://tiempo-con-ia.vercel.app/catalog/catalog.json';
const liveCatalogUrl = 'https://tiempo-con-ia-catalogo-20261018.pablocastenda.chatgpt.site/api/resources';
const githubCatalogUrl = 'https://tiempo-con-ia.vercel.app/catalog/live.json';

export async function listPublishedSkills(): Promise<{ skills: PublishedSkill[]; liveAvailable: boolean }> {
  const [staticResult, liveResult] = await Promise.allSettled([
    fetch(staticCatalogUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) }).then(async response => {
      if (!response.ok) throw new Error('Catálogo de Vercel no disponible');
      return await response.json() as unknown;
    }).catch(() => readFile(path.join(process.cwd(), 'web/public/catalog/catalog.json'), 'utf8').then(content => JSON.parse(content) as unknown)),
    fetch(githubCatalogUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) }).then(async response => {
      if (!response.ok) throw new Error('Catálogo de GitHub no disponible');
      const catalog = await response.json() as { migrated?: boolean; resources?: unknown };
      if (catalog.migrated) return catalog;
      const legacy = await fetch(liveCatalogUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!legacy.ok) throw new Error('Catálogo del estudio no disponible');
      return await legacy.json() as unknown;
    })
  ]);
  if (staticResult.status === 'rejected' && liveResult.status === 'rejected')
    throw new Error('No se pudieron cargar las skills publicadas');
  const staticItems = staticResult.status === 'fulfilled' && Array.isArray(staticResult.value) ? staticResult.value : [];
  const liveValue = liveResult.status === 'fulfilled' ? liveResult.value as { resources?: unknown } : null;
  const liveItems = Array.isArray(liveValue?.resources) ? liveValue.resources : [];
  const skills = new Map<string, PublishedSkill>();
  for (const [items, source] of [[staticItems, 'GitHub'], [liveItems, 'Estudio']] as const) {
    for (const item of items) {
      if (!item || item.kind !== 'skill' || typeof item.id !== 'string' || typeof item.title !== 'string') continue;
      skills.set(item.id, { id: item.id, title: item.title, description: String(item.description || ''), source });
    }
  }
  return {
    skills: [...skills.values()].sort((a, b) => a.title.localeCompare(b.title, 'es')),
    liveAvailable: liveResult.status === 'fulfilled' && Array.isArray(liveValue?.resources)
  };
}

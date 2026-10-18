import { updatePublicComplements, type PublicComplement } from './complements';

const owner = 'Pablo06Casta';
const repository = 'TIEMPO-CON-IA';
const branch = 'main';
const filename = 'web/public/catalog/complements.json';
const apiUrl = `https://api.github.com/repos/${owner}/${repository}/contents/${filename}`;

export async function publishComplement(entry: PublicComplement, remove = false): Promise<void> {
  const token = process.env.GITHUB_CONTENTS_TOKEN;
  if (!token) throw new Error('Falta GITHUB_CONTENTS_TOKEN en el servidor del estudio');
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      };
      const response = await fetch(`${apiUrl}?ref=${branch}`, { headers, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`GitHub no pudo leer el catálogo (${response.status})`);
      const file = await response.json() as { sha: string; content: string; encoding: string };
      if (file.encoding !== 'base64' || !file.sha) throw new Error('GitHub devolvió un catálogo inesperado');
      const current = JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8'));
      const next = updatePublicComplements(current, entry, remove);
      const result = await fetch(apiUrl, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({
          message: `${remove ? 'Unpublish' : 'Publish'} complement ${entry.id}`,
          content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64'),
          sha: file.sha, branch
        })
      });
      if (result.status === 409 && attempt === 0) continue;
      if (!result.ok) throw new Error(`GitHub no pudo actualizar el catálogo (${result.status})`);
      return;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('El catálogo cambió durante la publicación. Inténtalo de nuevo.');
}

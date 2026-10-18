import { z } from 'zod';

export const complementInput = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  skillIds: z.array(z.string().regex(/^(?:[a-z0-9][a-z0-9-]*|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/)).min(2).max(20)
}).refine(value => new Set(value.skillIds).size === value.skillIds.length, {
  message: 'Selecciona skills distintas', path: ['skillIds']
});

export type ComplementInput = z.infer<typeof complementInput>;
export type PublicComplement = { id: string; title: string; description: string; skills: string[] };

export function updatePublicComplements(current: unknown, entry: PublicComplement, remove = false): PublicComplement[] {
  if (!Array.isArray(current)) throw new Error('El catálogo público de complementos no es válido');
  const items = current as PublicComplement[];
  if (items.some(item => !item || typeof item.id !== 'string')) throw new Error('El catálogo público de complementos no es válido');
  const next = items.filter(item => item.id !== entry.id);
  if (!remove) next.push(entry);
  return next;
}

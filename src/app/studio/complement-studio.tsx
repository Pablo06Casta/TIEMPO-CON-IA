'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Puzzle, Trash2, X } from 'lucide-react';

type Complement = { id: string; title: string; description: string; skillIds: string[]; publishedAt: number | null; createdAt: number; updatedAt: number };
type Skill = { id: string; title: string; description: string; source: string };
type SkillCatalog = { skills: Skill[]; liveAvailable: boolean };
type Draft = Pick<Complement, 'title' | 'description' | 'skillIds'> & { id?: string; publishedAt?: number | null; updatedAt?: number };
const empty: Draft = { title: '', description: '', skillIds: [] };

async function api<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación');
  return result as T;
}

export default function ComplementStudio() {
  const [items, setItems] = useState<Complement[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const refresh = useCallback(async () => {
    const [complements, publishedSkills] = await Promise.allSettled([
      api<Complement[]>('/api/complements'), api<SkillCatalog>('/api/complement-skills')
    ]);
    if (complements.status === 'rejected') throw complements.reason;
    setItems(complements.value);
    if (publishedSkills.status === 'fulfilled') {
      setSkills(publishedSkills.value.skills);
      if (!publishedSkills.value.liveAvailable) setError('El catálogo externo no responde ahora. Las skills de GitHub siguen disponibles.');
    }
    else setError('No se pudieron cargar las skills publicadas. Podrás seleccionarlas cuando vuelva el catálogo.');
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch(e => setError((e as Error).message)); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const choices = useMemo(() => skills.filter(skill => `${skill.title} ${skill.description}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))), [skills, search]);

  async function save(publish: boolean) {
    if (!editing || busy) return;
    if (editing.skillIds.length < 2 || editing.skillIds.length > 20) {
      setError('Selecciona entre 2 y 20 skills publicadas.'); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const body = { title: editing.title, description: editing.description, skillIds: editing.skillIds };
      const saved = await api<Complement>(editing.id ? `/api/complements/${editing.id}` : '/api/complements', editing.id ? 'PATCH' : 'POST', body);
      setEditing(saved);
      if (publish) {
        const published = await api<Complement>(`/api/complements/${saved.id}/publish`, 'POST');
        setEditing(published);
        setNotice('Complemento enviado a GitHub. Vercel lo mostrará cuando termine el despliegue.');
      } else setNotice('Borrador guardado en el estudio.');
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function unpublish(item: Complement) {
    if (!confirm(`¿Retirar “${item.title}” de la web pública?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await api<Complement>(`/api/complements/${item.id}/unpublish`, 'POST');
      setEditing(updated); await refresh();
      setNotice('Retirada enviada a GitHub. Vercel aplicará el cambio al desplegar.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(item: Complement) {
    if (!confirm(`¿Eliminar el borrador “${item.title}”?`)) return;
    setBusy(true); setError('');
    try {
      await api(`/api/complements/${item.id}`, 'DELETE');
      setEditing(null); await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="content complement-studio">
    <div className="page-intro row"><div><span className="eyebrow ink">COMPLEMENTOS</span><h1>Reúne varias skills.</h1><p>Crea un conjunto con skills ya publicadas y envíalo a la biblioteca pública.</p></div><button className="button primary" onClick={() => { setEditing({ ...empty }); setError(''); setNotice(''); }}><Plus size={18}/> Nuevo complemento</button></div>
    {error && !editing && <p className="error" role="alert">{error}</p>}
    {notice && !editing && <p className="notice" role="status">{notice}</p>}
    {items.length ? <div className="resource-grid">{items.map(item => <article className="resource-card" key={item.id} onClick={() => { setEditing({ ...item, skillIds: [...item.skillIds] }); setError(''); setNotice(''); }}><div className="card-top"><span className="resource-icon"><Puzzle size={20}/></span><span className="pill">{item.publishedAt ? (item.updatedAt > item.publishedAt ? 'Cambios sin publicar' : 'Publicado') : 'Borrador'}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="card-foot"><span>{item.skillIds.length} skills</span><span>{new Date(item.updatedAt).toLocaleDateString('es-ES')}</span></div></article>)}</div> : <div className="complement-empty"><Puzzle size={28}/><h2>Tu primer complemento</h2><p>Selecciona al menos dos skills de la biblioteca pública para crear uno.</p><button className="button secondary" onClick={() => setEditing({ ...empty })}><Plus size={17}/> Crear complemento</button></div>}
    {editing && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><div className="editor-panel" role="dialog" aria-modal="true" aria-label="Editor de complemento"><div className="editor-header"><div><span className="eyebrow ink">{editing.id ? 'EDITAR COMPLEMENTO' : 'NUEVO COMPLEMENTO'}</span><h2>{editing.id ? 'Configurar complemento' : 'Crear complemento'}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={() => setEditing(null)}><X size={21}/></button></div><div className="editor-scroll"><div className="form-grid"><label className="span2">Nombre<input maxLength={80} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} placeholder="Por ejemplo: Investigación con IA"/></label><label className="span2">Descripción<textarea maxLength={240} rows={3} value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} placeholder="Qué reúne y para quién sirve"/></label></div><div className="editor-section"><h3>Skills publicadas</h3><p>Elige entre 2 y 20. Las skills privadas no se incluirán hasta que estén publicadas.</p><input className="complement-search" aria-label="Buscar skills publicadas" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar skills…"/><div className="relation-list">{choices.map(skill => <label key={skill.id}><input type="checkbox" checked={editing.skillIds.includes(skill.id)} onChange={event => setEditing({ ...editing, skillIds: event.target.checked ? [...editing.skillIds, skill.id] : editing.skillIds.filter(id => id !== skill.id) })}/><span>{skill.title}<small>{skill.source} · {skill.description}</small></span></label>)}{!choices.length && <p>No hay skills publicadas disponibles con esta búsqueda.</p>}{editing.skillIds.filter(id => !skills.some(skill => skill.id === id)).map(id => <label key={id}><input type="checkbox" checked onChange={() => setEditing({ ...editing, skillIds: editing.skillIds.filter(value => value !== id) })}/><span>Skill no disponible<small>{id} · desmárcala para continuar</small></span></label>)}</div><p className="complement-selection-count">{editing.skillIds.length} skills seleccionadas</p></div>{editing.id && <div className="editor-actions-extra">{editing.publishedAt && <button disabled={busy} onClick={() => void unpublish(editing as Complement)}>Retirar de la web</button>}{!editing.publishedAt && <button disabled={busy} onClick={() => void remove(editing as Complement)}><Trash2 size={16}/> Eliminar borrador</button>}</div>}{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}</div><div className="editor-footer"><span>{editing.publishedAt ? 'Los cambios aparecerán al volver a publicar' : 'Puedes guardar antes de publicar'}</span><div className="complement-editor-actions"><button className="button secondary" disabled={busy} onClick={() => void save(false)}>Guardar borrador</button><button className="button primary" disabled={busy} onClick={() => void save(true)}>{busy ? 'Guardando…' : editing.publishedAt ? 'Guardar y republicar' : 'Guardar y publicar'}</button></div></div></div></div>}
  </div>;
}

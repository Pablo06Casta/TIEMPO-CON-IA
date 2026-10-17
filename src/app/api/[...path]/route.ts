import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import db, { uploadDir } from '@/lib/db';
import { currentUser, newSession, tokenHash, verifyPassword } from '@/lib/auth';
import { inspectSkillZip } from '@/lib/skill-zip';

export const runtime = 'nodejs';
const resourceSchema = z.object({
  kind: z.enum(['prompt','skill','agent','automation','file','other']),
  title: z.string().trim().min(1).max(160), description: z.string().max(2000).default(''),
  content: z.string().max(200000).default(''), category: z.string().max(100).default(''),
  tags: z.array(z.string().max(40)).max(20).default([]), metadata: z.record(z.string(),z.string().max(10000)).default({}), status: z.enum(['active','archived']).default('active')
});
const projectSchema = z.object({
  title: z.string().trim().min(1).max(160), objective: z.string().max(500).default(''),
  description: z.string().max(10000).default(''), status: z.enum(['active','archived']).default('active'),
  resourceIds: z.array(z.number().int().positive()).max(100).default([])
});
type Context = { params: Promise<{ path: string[] }> };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status });
const bad = (message: string, status = 400) => json({ error: message }, status);
const numericId = (value?: string) => value && /^\d+$/.test(value) ? Number(value) : 0;
const data = async (request: Request) => { try { return await request.json(); } catch { return null; } };
const resource = (id: number) => db.prepare('SELECT * FROM resources WHERE id=?').get(id) as Record<string, unknown> | undefined;
const project = (id: number) => db.prepare('SELECT * FROM projects WHERE id=?').get(id) as Record<string, unknown> | undefined;
const safeResource = (row: Record<string, unknown>) => ({ ...row, tags: JSON.parse(String(row.tags)), metadata: JSON.parse(String(row.metadata)) });
const validOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':','');
    return source.host === host && source.protocol === `${protocol}:`;
  } catch { return false; }
};

async function handle(request: NextRequest, context: Context) {
  const method = request.method;
  const segments = (await context.params).path;
  const [base, idText, action] = segments;
  const id = numericId(idText);
  if (method !== 'GET' && !validOrigin(request)) return bad('Origen no autorizado', 403);
  if (base === 'login' && method === 'POST') {
    const input = z.object({ email: z.email(), password: z.string() }).safeParse(await data(request));
    if (!input.success) return bad('Datos de acceso inválidos');
    const attemptKey = input.data.email.toLowerCase();
    const attempt = db.prepare('SELECT attempts,first_at FROM login_attempts WHERE key=?').get(attemptKey) as {attempts:number;first_at:number}|undefined;
    if (attempt && attempt.first_at > Date.now()-15*60000 && attempt.attempts >= 5) return bad('Demasiados intentos. Espera 15 minutos.',429);
    const user = db.prepare('SELECT id,email,password_hash FROM users WHERE email=?').get(input.data.email.toLowerCase()) as {id:number;email:string;password_hash:string}|undefined;
    if (!user || !verifyPassword(input.data.password, user.password_hash)) {
      if (!attempt || attempt.first_at < Date.now()-15*60000) db.prepare('INSERT OR REPLACE INTO login_attempts(key,attempts,first_at) VALUES(?,?,?)').run(attemptKey,1,Date.now());
      else db.prepare('UPDATE login_attempts SET attempts=attempts+1 WHERE key=?').run(attemptKey);
      return bad('Credenciales incorrectas', 401);
    }
    db.prepare('DELETE FROM login_attempts WHERE key=?').run(attemptKey);
    const token = newSession(user.id);
    const response = json({ email: user.email });
    response.cookies.set('tcia_session', token, { httpOnly: true, secure: request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 604800 });
    return response;
  }
  const user = await currentUser();
  if (!user) return bad('Inicia sesión', 401);
  if (base === 'me' && method === 'GET') return json(user);
  if (base === 'logout' && method === 'POST') {
    const token = request.cookies.get('tcia_session')?.value;
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));
    const response = json({ ok: true });
    response.cookies.delete('tcia_session');
    return response;
  }
  if (base === 'skills' && idText === 'import' && method === 'POST') {
    const form = await request.formData(); const file = form.get('file');
    if (!(file instanceof File) || path.extname(file.name).toLowerCase() !== '.zip' || file.size > 20*1024*1024) return bad('Selecciona un ZIP de hasta 20 MB');
    const bytes = Buffer.from(await file.arrayBuffer());
    let skill; try { skill = inspectSkillZip(bytes); } catch(e) { return bad((e as Error).message); }
    const now = Date.now(); const storage = randomUUID();
    await writeFile(path.join(uploadDir,storage),bytes,{mode:0o600,flag:'wx'});
    const created = db.prepare('INSERT INTO resources(kind,title,description,content,category,tags,metadata,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('skill',skill.title,`Importada desde ${file.name}` ,skill.content,'Skills','[]',JSON.stringify({archivePath:skill.path}),'active',now,now);
    const resourceId = Number(created.lastInsertRowid); const row = resource(resourceId)!;
    db.prepare('INSERT INTO resource_versions(resource_id,version,snapshot,created_at) VALUES(?,?,?,?)').run(resourceId,1,JSON.stringify(safeResource(row)),now);
    db.prepare('INSERT INTO files(resource_id,storage_name,original_name,mime,size,version,created_at) VALUES(?,?,?,?,?,?,?)').run(resourceId,storage,path.basename(file.name),'application/zip',file.size,1,now);
    return json(safeResource(row),201);
  }
  if (base === 'resources') {
    if (!idText && method === 'GET') {
      const rows = db.prepare('SELECT * FROM resources ORDER BY updated_at DESC').all() as Record<string,unknown>[];
      return json(rows.map(safeResource));
    }
    if (!idText && method === 'POST') {
      const parsed = resourceSchema.safeParse(await data(request));
      if (!parsed.success) return bad('Revisa los campos del recurso');
      const { kind, title, description, content, category, tags, metadata, status } = parsed.data;
      const now = Date.now();
      const result = db.prepare('INSERT INTO resources(kind,title,description,content,category,tags,metadata,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(kind,title,description,content,category,JSON.stringify(tags),JSON.stringify(metadata),status,now,now);
      const row = resource(Number(result.lastInsertRowid))!;
      db.prepare('INSERT INTO resource_versions(resource_id,version,snapshot,created_at) VALUES(?,?,?,?)').run(Number(row.id),1,JSON.stringify(safeResource(row)),now);
      return json(safeResource(row), 201);
    }
    const row = resource(id);
    if (!row) return bad('Recurso no encontrado', 404);
    if (action === 'versions' && method === 'GET') {
      return json(db.prepare('SELECT version,snapshot,created_at FROM resource_versions WHERE resource_id=? ORDER BY version DESC').all(id).map((v) => ({ ...v, snapshot: JSON.parse(String(v.snapshot)) })));
    }
    if (action === 'restore' && method === 'POST') {
      const version = numericId(String((await data(request))?.version));
      const old = db.prepare('SELECT snapshot FROM resource_versions WHERE resource_id=? AND version=?').get(id,version) as {snapshot:string}|undefined;
      if (!old) return bad('Versión no encontrada',404);
      const restored = resourceSchema.parse(JSON.parse(old.snapshot));
      return saveResource(id, restored, row);
    }
    if (method === 'GET' && !action) return json(safeResource(row));
    if (method === 'PATCH' && !action) {
      const parsed = resourceSchema.safeParse({ ...safeResource(row), ...await data(request) });
      if (!parsed.success) return bad('Revisa los campos del recurso');
      return saveResource(id, parsed.data, row);
    }
    if (method === 'DELETE' && !action) { const names = db.prepare('SELECT storage_name FROM files WHERE resource_id=?').all(id).map(r=>String(r.storage_name)); db.prepare('DELETE FROM resources WHERE id=?').run(id); await Promise.all(names.map(n=>unlink(path.join(uploadDir,n)).catch(()=>{}))); return json({ ok: true }); }
  }
  if (base === 'projects') {
    if (!idText && method === 'GET') {
      const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Record<string,unknown>[];
      return json(rows.map((p) => ({ ...p, resourceIds: db.prepare('SELECT resource_id FROM project_resources WHERE project_id=?').all(Number(p.id)).map((r) => r.resource_id) })));
    }
    if (!idText && method === 'POST') {
      const parsed = projectSchema.safeParse(await data(request));
      if (!parsed.success) return bad('Revisa los campos del proyecto');
      const now = Date.now(); const p = parsed.data;
      const result = db.prepare('INSERT INTO projects(title,objective,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(p.title,p.objective,p.description,p.status,now,now);
      const projectId = Number(result.lastInsertRowid);
      setRelations(projectId,p.resourceIds);
      return json({ ...project(projectId), resourceIds: p.resourceIds },201);
    }
    const row = project(id);
    if (!row) return bad('Proyecto no encontrado',404);
    if (method === 'PATCH' && !action) {
      const previousIds = db.prepare('SELECT resource_id FROM project_resources WHERE project_id=?').all(id).map((r) => Number(r.resource_id));
      const parsed = projectSchema.safeParse({ ...row, resourceIds: previousIds, ...await data(request) });
      if (!parsed.success) return bad('Revisa los campos del proyecto');
      const p = parsed.data;
      db.prepare('UPDATE projects SET title=?,objective=?,description=?,status=?,updated_at=? WHERE id=?').run(p.title,p.objective,p.description,p.status,Date.now(),id);
      setRelations(id,p.resourceIds);
      return json({ ...project(id), resourceIds: p.resourceIds });
    }
    if (method === 'DELETE' && !action) { db.prepare('DELETE FROM projects WHERE id=?').run(id); return json({ok:true}); }
  }
  if (base === 'files') {
    if (!idText && method === 'GET') return json(db.prepare('SELECT id,resource_id,original_name,mime,size,category,tags,version,created_at FROM files ORDER BY created_at DESC').all().map(f=>({...f,tags:JSON.parse(String(f.tags))})));
    if (!idText && method === 'POST') {
      const form = await request.formData();
      const resourceId = numericId(String(form.get('resourceId')));
      if (!resource(resourceId)) return bad('Asocia los archivos a un recurso existente');
      const files = form.getAll('files');
      if (!files.length || files.length > 10 || files.some((f) => !(f instanceof File))) return bad('Selecciona entre 1 y 10 archivos');
      const allowed = new Set(['.md','.txt','.json','.yaml','.yml','.zip','.pdf','.docx','.png','.jpg','.jpeg','.webp','.gif']);
      const results = [];
      for (const file of files as File[]) {
        const name = path.basename(file.name).replace(/[\x00-\x1f\x7f]/g, '').slice(0,200);
        if (!name || !allowed.has(path.extname(name).toLowerCase()) || file.size > 20 * 1024 * 1024) return bad('Tipo o tamaño de archivo no permitido (máximo 20 MB)');
        const storage = randomUUID();
        const bytes = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadDir, storage), bytes, { mode: 0o600, flag: 'wx' });
        const previous = db.prepare('SELECT MAX(version) AS version FROM files WHERE resource_id=? AND original_name=?').get(resourceId,name) as {version:number|null};
        const result = db.prepare('INSERT INTO files(resource_id,storage_name,original_name,mime,size,version,created_at) VALUES(?,?,?,?,?,?,?)').run(resourceId,storage,name,file.type || 'application/octet-stream',file.size,(previous.version || 0)+1,Date.now());
        results.push({ id: Number(result.lastInsertRowid), original_name:name });
      }
      return json(results,201);
    }
    const row = db.prepare('SELECT * FROM files WHERE id=?').get(id) as {id:number;storage_name:string;original_name:string;mime:string}|undefined;
    if (!row) return bad('Archivo no encontrado',404);
    if (method === 'PATCH') {
      const parsed = z.object({category:z.string().max(100),tags:z.array(z.string().max(40)).max(20)}).safeParse(await data(request));
      if (!parsed.success) return bad('Metadatos inválidos');
      db.prepare('UPDATE files SET category=?,tags=? WHERE id=?').run(parsed.data.category,JSON.stringify(parsed.data.tags),id);
      return json({ok:true});
    }
    if (method === 'GET') {
      const bytes = await readFile(path.join(uploadDir,row.storage_name));
      const filename = encodeURIComponent(row.original_name);
      const previewTypes:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'text/plain; charset=utf-8','.yaml':'text/plain; charset=utf-8','.yml':'text/plain; charset=utf-8'};
      const type = previewTypes[path.extname(row.original_name).toLowerCase()];
      const inline = request.nextUrl.searchParams.get('preview') === '1' && !!type;
      return new Response(bytes, { headers: { 'Content-Type': inline ? type : 'application/octet-stream', 'Content-Disposition': `${inline?'inline':'attachment'}; filename*=UTF-8''${filename}`, 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox", 'Cache-Control':'private, no-store' } });
    }
    if (method === 'DELETE') { db.prepare('DELETE FROM files WHERE id=?').run(id); await unlink(path.join(uploadDir,row.storage_name)).catch(()=>{}); return json({ok:true}); }
  }
  return bad('Ruta no encontrada',404);
}

function setRelations(projectId: number, resourceIds: number[]) {
  db.prepare('DELETE FROM project_resources WHERE project_id=?').run(projectId);
  for (const id of new Set(resourceIds)) if (resource(id)) db.prepare('INSERT INTO project_resources(project_id,resource_id) VALUES(?,?)').run(projectId,id);
}
function saveResource(id: number, value: z.infer<typeof resourceSchema>, old: Record<string,unknown>) {
  const version = Number(old.version)+1; const now = Date.now();
  db.prepare('UPDATE resources SET kind=?,title=?,description=?,content=?,category=?,tags=?,metadata=?,status=?,version=?,updated_at=? WHERE id=?').run(value.kind,value.title,value.description,value.content,value.category,JSON.stringify(value.tags),JSON.stringify(value.metadata),value.status,version,now,id);
  const row = safeResource(resource(id)!);
  db.prepare('INSERT INTO resource_versions(resource_id,version,snapshot,created_at) VALUES(?,?,?,?)').run(id,version,JSON.stringify(row),now);
  return json(row);
}
export async function GET(request: NextRequest, context: Context) { try { return await handle(request,context); } catch (error) { console.error(error); return bad('Error interno',500); } }
export async function POST(request: NextRequest, context: Context) { try { return await handle(request,context); } catch (error) { console.error(error); return bad('Error interno',500); } }
export async function PATCH(request: NextRequest, context: Context) { try { return await handle(request,context); } catch (error) { console.error(error); return bad('Error interno',500); } }
export async function DELETE(request: NextRequest, context: Context) { try { return await handle(request,context); } catch (error) { console.error(error); return bad('Error interno',500); } }

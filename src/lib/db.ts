import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '.data');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const uploadDir = path.join(dataDir, 'uploads');
mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(dataDir, 'app.sqlite'));
db.exec('PRAGMA busy_timeout=5000;');
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, first_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', metadata TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'active', version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS resource_versions (id INTEGER PRIMARY KEY, resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE, version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(resource_id, version));
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, title TEXT NOT NULL, objective TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS project_resources (project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE, PRIMARY KEY(project_id, resource_id));
CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE, storage_name TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, category TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS complements (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, skill_ids TEXT NOT NULL, published_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_resources_kind ON resources(kind);
CREATE INDEX IF NOT EXISTS idx_files_resource ON files(resource_id);
`);
if (!db.prepare("PRAGMA table_info(resources)").all().some(column => column.name === 'metadata')) db.exec("ALTER TABLE resources ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'");
if (!db.prepare("PRAGMA table_info(files)").all().some(column => column.name === 'category')) db.exec("ALTER TABLE files ADD COLUMN category TEXT NOT NULL DEFAULT ''");
if (!db.prepare("PRAGMA table_info(files)").all().some(column => column.name === 'tags')) db.exec("ALTER TABLE files ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
export default db;

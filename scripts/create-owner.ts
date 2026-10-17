import db from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 12) {
  console.error('Define OWNER_EMAIL válido y OWNER_PASSWORD de al menos 12 caracteres.');
  process.exit(1);
}
const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email) as {id:number}|undefined;
if (existing) {
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);
  console.log('Contraseña actualizada; sesiones anteriores cerradas.');
} else {
  db.prepare('INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,?)').run(email, hashPassword(password), 'owner', Date.now());
  console.log('Propietario creado.');
}

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import db from './db';

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, saved: string) {
  const [salt, hex] = saved.split(':');
  if (!salt || !hex || hex.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export async function currentUser() {
  const token = (await cookies()).get('tcia_session')?.value;
  if (!token) return null;
  return db.prepare('SELECT users.id, users.email, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').get(tokenHash(token), Date.now()) as { id: number; email: string; role: string } | undefined || null;
}
export function newSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(tokenHash(token), userId, Date.now() + 7 * 86400000);
  return token;
}

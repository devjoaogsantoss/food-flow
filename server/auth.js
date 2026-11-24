import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128)
    throw Object.assign(new Error('A senha precisa ter entre 10 e 128 caracteres.'), { code: 'INVALID_INPUT' });
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
const dummy = hashPassword('unused-dummy-password');
export function verifyPassword(password, encoded = dummy) {
  const [salt, hex] = encoded.split(':');
  const candidate = scryptSync(String(password ?? '').slice(0, 128), salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hex, 'hex'));
}
export function issueSession(db, principal, role) {
  const token = randomBytes(32).toString('base64url');
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token), principal, role, expires);
  return { token, expires, principal, role };
}
export function sessionFor(db, request) {
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.authorization ?? '');
  return match ? db.prepare('SELECT principal,role,expires FROM sessions WHERE token_hash=? AND expires>?').get(digest(match[1]), Date.now()) : null;
}

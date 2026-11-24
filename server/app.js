import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase } from './database.js';
import { digest, hashPassword, verifyPassword, issueSession, sessionFor } from './auth.js';
import { createReservationsApi } from '../src/services/reservationsApi.js';
import { createReceptionApi } from '../src/services/receptionApi.js';
import { createOrdersApi, menu } from '../src/services/ordersApi.js';
import { readState } from '../src/services/localStore.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const statusCodes = { INVALID_INPUT: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, INVALID_STATE: 422, PAYMENT_DECLINED: 422, RATE_LIMIT: 429 };
export function createApp({ filename = process.env.FOOD_FLOW_DB ?? 'data/food-flow.sqlite', now = () => new Date(), serveStatic = true } = {}) {
  const database = openDatabase(filename);
  const { db, storage, transaction } = database;
  const reservations = createReservationsApi({ storage, now });
  const reception = createReceptionApi({ storage, now });
  const orders = createOrdersApi({ storage });
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
  app.use('/api', (req, _res, next) => {
    // Sessões Bearer não são anexadas automaticamente pelo navegador. Sem CORS;
    // rejeitamos também chamadas explicitamente cross-site e corpos não JSON.
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (req.headers['sec-fetch-site'] === 'cross-site') return next(Object.assign(new Error('Origem não permitida.'), { code: 'FORBIDDEN' }));
      if (Number(req.headers['content-length'] ?? 0) > 0 && !req.is('application/json'))
        return next(Object.assign(new Error('Envie JSON.'), { code: 'INVALID_INPUT' }));
    }
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  const route = (method, path, action) => app[method]('/api' + path, async (req, res, next) => {
    try {
      const result = await transaction(async () => {
        req.actor = sessionFor(db, req);
        req.body ??= {};
        const key = req.get('Idempotency-Key');
        const scope = `${req.actor?.principal ?? 'public'}:${req.method}:${req.path}`;
        const fingerprint = digest(JSON.stringify(req.body));
        if (key && (key.length > 128 || !/^[\w-]+$/.test(key))) fail('INVALID_INPUT', 'Chave de idempotência inválida.');
        if (key) {
          const previous = db.prepare('SELECT * FROM idempotency WHERE scope=? AND key=?').get(scope, key);
          if (previous) {
            if (previous.fingerprint !== fingerprint) fail('CONFLICT', 'Chave já usada com outra operação.');
            return JSON.parse(previous.response);
          }
        }
        const value = (await action(req)) ?? { changed: true };
        if (key) db.prepare('INSERT INTO idempotency VALUES(?,?,?,?)').run(scope, key, fingerprint, JSON.stringify(value));
        return value;
      });
      res.json(result);
    } catch (error) { next(error); }
  });
  function roles(req, ...allowed) {
    if (!req.actor) fail('UNAUTHORIZED', 'Entre com matrícula e senha ou autentique sua reserva.');
    if (!allowed.includes(req.actor.role)) fail('FORBIDDEN', 'Seu perfil não permite esta ação.');
  }
  function owner(req, reservationId, ...staffRoles) {
    roles(req, 'cliente', ...staffRoles);
    if (req.actor.role === 'cliente' && req.actor.principal !== reservationId) fail('FORBIDDEN', 'Esta reserva não pertence à sua sessão.');
  }
  async function check(req, commandId, ...staffRoles) {
    const command = await orders.getCommand(commandId);
    if (!command) fail('NOT_FOUND', 'Comanda não encontrada.');
    owner(req, command.reservationId, ...staffRoles);
    return command;
  }
  function login(req, principal, hash, role) {
    const key = digest(`${req.ip}:${principal}`);
    const time = Date.now();
    const record = db.prepare('SELECT * FROM login_attempts WHERE key=?').get(key);
    if (record?.expires > time && record.attempts >= 10) return { error: 'RATE_LIMIT' };
    if (!verifyPassword(req.body.password, hash) || !hash) {
      db.prepare('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires>? THEN attempts+1 ELSE 1 END, expires=excluded.expires').run(key, time + 15*60000, time);
      return { error: 'UNAUTHORIZED' };
    }
    db.prepare('DELETE FROM login_attempts WHERE key=?').run(key);
    return issueSession(db, principal, role);
  }
  // Falhas de login precisam ser confirmadas para persistir o limitador.
  const authRoute = (path, getUser) => app.post('/api/auth/' + path, async (req, res, next) => {
    try {
      const result = await transaction(() => { req.body ??= {}; const user = getUser(req); return login(req, user.id, user.hash, user.role); });
      if (result.error) return res.status(statusCodes[result.error]).json({ code: result.error, message: result.error === 'RATE_LIMIT' ? 'Muitas tentativas. Aguarde 15 minutos.' : 'Identificação ou senha inválida.' });
      res.json(result);
    } catch(error) { next(error); }
  });
  authRoute('staff', req => { const id = String(req.body.registration ?? ''); const user = db.prepare('SELECT * FROM users WHERE id=?').get(id); return { id, hash: user?.password_hash, role: user?.role }; });
  authRoute('guest', req => { const id = String(req.body.code ?? '').trim().toUpperCase(); const user = db.prepare('SELECT * FROM guest_credentials WHERE reservation_id=?').get(id); return { id, hash: user?.password_hash, role: 'cliente' }; });
  route('get', '/health', () => ({ status: 'ok', database: db.prepare('SELECT version FROM migrations ORDER BY version DESC LIMIT 1').get().version }));
  route('get', '/auth/session', req => { roles(req, 'cliente','recepcao','garcom','cozinha'); return req.actor; });
  route('post', '/auth/logout', req => { const token = req.headers.authorization?.slice(7); if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); return { ok: true }; });
  route('get', '/menu', () => menu);
  route('get', '/services/availability', req => reservations.getAvailability(req.query));
  route('post', '/reservations', async req => {
    const password = hashPassword(req.body.password);
    const reservation = await reservations.confirm(req.body);
    db.prepare('INSERT INTO guest_credentials VALUES(?,?)').run(reservation.id, password);
    return { ...reservation, session: issueSession(db, reservation.id, 'cliente') };
  });
  route('get', '/reservations', req => { roles(req, 'recepcao'); return reception.getReservations(req.query); });
  route('get', '/reservations/:id', req => { owner(req, req.params.id, 'recepcao'); return reservations.getReservation(req.params.id); });
  route('get', '/reservations/:id/status', req => { owner(req, req.params.id, 'recepcao'); return reception.getGuestStatus(req.params.id); });
  route('post', '/reservations/:id/cancel', req => { owner(req, req.params.id); return reservations.cancel(req.params.id); });
  route('post', '/waitlist', req => req.actor?.role === 'recepcao' ? reception.addWaitlistEntry(req.body, 'recepcao') : reservations.joinWaitlist(req.body));
  route('get', '/reception/operations', req => { roles(req, 'recepcao'); return reception.getOperations(); });
  route('patch', '/waitlist/:id', req => { roles(req, 'recepcao'); return reception.updateWaitlistEntry(req.params.id, req.body.status, 'recepcao'); });
  route('put', '/reception/bar', req => { roles(req, 'recepcao'); return reception.setBarOccupancy(req.body.occupancy, 'recepcao'); });
  for (const [path, action] of Object.entries({ 'check-in': req => {
    if (typeof req.body.parkingRequired !== 'boolean') fail('INVALID_INPUT', 'Informe o estacionamento.');
    return reception.registerArrival(req.params.id, 'recepcao', req.body.parkingRequired);
  }, wait: req => reception.registerWait(req.params.id, req.body.tableId, 'recepcao'), accommodation: req => reception.confirmSeating(req.params.id, req.body.tableId, 'recepcao'), departure: req => reception.registerDeparture(req.params.id, 'recepcao') })) {
    route('post', '/reservations/:id/' + path, req => { roles(req, 'recepcao'); return action(req); });
  }
  route('patch', '/reservations/:id/parking', req => { roles(req, 'recepcao'); return reception.updateParking(req.params.id, req.body.parkingRequired, 'recepcao'); });
  route('post', '/tables/:id/release', req => { roles(req, 'recepcao'); return reception.markTableReady(req.params.id, 'recepcao'); });
  route('get', '/tables', async req => {
    roles(req, 'recepcao','garcom','cozinha','cliente');
    if (req.actor.role === 'recepcao') return reception.getTables();
    const tables = await orders.getTables();
    if (req.actor.role !== 'cliente') return tables;
    const commands = (await orders.getCommands()).filter(c => c.reservationId === req.actor.principal);
    return tables.filter(t => commands.some(c => c.tableId === t.id));
  });
  route('get', '/checks', async req => { roles(req, 'garcom','cozinha','cliente'); const commands = await orders.getCommands(); return req.actor.role === 'cliente' ? commands.filter(c => c.reservationId === req.actor.principal) : commands; });
  route('get', '/checks/:id', req => check(req, req.params.id, 'garcom','cozinha'));
  route('post', '/orders', async req => { await check(req, req.body.commandId, 'garcom'); return orders.createOrder(req.body.commandId, req.body.items, req.actor.role === 'cliente' ? 'cliente' : 'garcom', { notes: req.body.notes }); });
  route('patch', '/rounds/:id', async req => {
    if (req.body.status === 'pronto') { roles(req, 'cozinha'); return orders.markRoundReady(req.body.commandId, req.params.id); }
    if (req.body.status === 'entregue') { roles(req, 'garcom'); return orders.deliverRound(req.body.commandId, req.params.id); }
    fail('INVALID_INPUT', 'Estado da rodada inválido.');
  });
  route('post', '/checks/:id/calls', async req => { await check(req, req.params.id); return orders.callWaiter(req.params.id, req.body.type); });
  route('patch', '/checks/:id/calls/:callId', req => { roles(req, 'garcom'); return orders.attendCall(req.params.id, req.params.callId); });
  route('patch', '/checks/:id/tasting', async req => { await check(req, req.params.id, 'garcom'); return orders.saveTasting(req.params.id, req.body); });
  app.use('/api', (_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Endpoint não encontrado.' }));
  app.use((error, _req, res, _next) => {
    const constraint = error.code?.startsWith('ERR_SQLITE') && /constraint|capacity|UNIQUE/i.test(error.message);
    const code = constraint ? 'CONFLICT' : error.code ?? (error.status === 400 ? 'INVALID_INPUT' : 'INVALID_STATE');
    const status = statusCodes[code] ?? 500;
    res.status(status).json({ code: status === 500 ? 'SERVER_ERROR' : code, message: status === 500 ? 'Falha ao processar a operação.' : constraint ? 'Conflito: operação duplicada ou capacidade esgotada.' : error.message });
  });
  if (serveStatic && existsSync(resolve('dist/index.html'))) {
    app.use(express.static(resolve('dist')));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
  }
  return { app, ...database };
}

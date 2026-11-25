import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase } from './database.js';
import { digest, hashPassword, verifyPassword, issueSession, sessionFor } from './auth.js';
import { randomUUID } from 'node:crypto';
import { createReservationsApi } from '../src/services/reservationsApi.js';
import { createReceptionApi } from '../src/services/receptionApi.js';
import { createOrdersApi, menu } from '../src/services/ordersApi.js';
import { readState, writeState } from '../src/services/localStore.js';
import { createCheckoutApi } from '../src/services/checkoutApi.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const statusCodes = { INVALID_INPUT: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, INVALID_STATE: 422, MANUAL_REQUIRED: 422, PAYMENT_DECLINED: 422, RATE_LIMIT: 429 };
export function createApp({ filename = process.env.FOOD_FLOW_DB ?? 'data/food-flow.sqlite', now = () => new Date(), serveStatic = true } = {}) {
  const database = openDatabase(filename);
  const { db, storage, transaction } = database;
  const reservations = createReservationsApi({ storage, now });
  const reception = createReceptionApi({ storage, now });
  const orders = createOrdersApi({ storage });
  const checkout = createCheckoutApi({ storage, now, recordSettlement(command, settlement) {
    if (settlement.appliedCreditCents > 0) db.prepare('INSERT INTO check_credits VALUES(?,?,?)').run(command.id, command.reservationId, settlement.appliedCreditCents);
    db.prepare('INSERT INTO settlements VALUES(?,?,?,?,?)').run(command.id, settlement.reference, settlement.amountCents, settlement.channel, settlement.createdAt);
  } });
  const app = express();
  // Habilitar apenas atrás de um proxy confiável, com a porta Node privada.
  if (process.env.FOOD_FLOW_TRUST_PROXY === '1') app.set('trust proxy', 1);
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
    roles(req, 'cliente', 'cliente_conta', ...staffRoles);
    if (req.actor.role === 'cliente' && req.actor.principal !== reservationId) fail('FORBIDDEN', 'Esta reserva não pertence à sua sessão.');
    if (req.actor.role === 'cliente_conta' && !db.prepare('SELECT 1 FROM reservations WHERE id=? AND customer_id=?').get(reservationId, req.actor.principal)) fail('FORBIDDEN', 'Esta reserva não pertence à sua conta.');
  }
  async function check(req, commandId, ...staffRoles) {
    const command = await orders.getCommand(commandId);
    if (!command) fail('NOT_FOUND', 'Comanda não encontrada.');
    owner(req, command.reservationId, ...staffRoles);
    return command;
  }
  function login(req, principal, hash, role, codeExists = false) {
    const key = digest(`${req.ip}:${principal}`);
    const time = Date.now();
    const record = db.prepare('SELECT * FROM login_attempts WHERE key=?').get(key);
    if (record?.expires > time && record.attempts >= 10) return { error: 'RATE_LIMIT' };
    if (role === 'cliente' ? !codeExists : (!verifyPassword(req.body.password, hash) || !hash)) {
      db.prepare('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires>? THEN attempts+1 ELSE 1 END, expires=excluded.expires').run(key, time + 15*60000, time);
      return { error: 'UNAUTHORIZED' };
    }
    db.prepare('DELETE FROM login_attempts WHERE key=?').run(key);
    return issueSession(db, principal, role);
  }
  // Falhas de login precisam ser confirmadas para persistir o limitador.
  const authRoute = (path, getUser) => app.post('/api/auth/' + path, async (req, res, next) => {
    try {
      const result = await transaction(() => { req.body ??= {}; const user = getUser(req); return login(req, user.id, user.hash, user.role, user.codeExists); });
      if (result.error) return res.status(statusCodes[result.error]).json({ code: result.error, message: result.error === 'RATE_LIMIT' ? 'Muitas tentativas. Aguarde 15 minutos.' : 'Identificação ou senha inválida.' });
      res.json(result);
    } catch(error) { next(error); }
  });
  authRoute('staff', req => { const id = String(req.body.registration ?? ''); const user = db.prepare('SELECT * FROM users WHERE id=?').get(id); return { id, hash: user?.password_hash, role: user?.role }; });
  authRoute('customer', req => { const email = String(req.body.email ?? '').trim().toLowerCase(); const user = db.prepare('SELECT id,password_hash FROM customers WHERE email=?').get(email); return { id: user?.id ?? email, hash: user?.password_hash, role: 'cliente_conta' }; });
  app.post('/api/auth/customer/register', async (req, res, next) => {
    try {
      const session = await transaction(() => {
        const body = req.body ?? {};
        const firstName = String(body.firstName ?? '').trim();
        const lastName = String(body.lastName ?? '').trim();
        const email = String(body.email ?? '').trim().toLowerCase();
        const phone = String(body.phone ?? '').replace(/\D/g, '');
        const cpf = String(body.cpf ?? '').replace(/\D/g, '');
        const age = Number(body.age);
        if (firstName.length < 2 || firstName.length > 80 || lastName.length < 2 || lastName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 10 || phone.length > 13 || !/^\d{11}$/.test(cpf) || !Number.isInteger(age) || age < 18 || age > 120) fail('INVALID_INPUT', 'Confira nome, sobrenome, idade, CPF, e-mail e telefone.');
        const digits = [...cpf].map(Number);
        const validCpf = [9,10].every(length => { const sum = digits.slice(0,length).reduce((total,digit,index) => total + digit * (length + 1 - index),0); return digits[length] === (sum * 10) % 11 % 10; }) && !digits.every(digit => digit === digits[0]);
        if (!validCpf) fail('INVALID_INPUT', 'Informe um CPF válido.');
        const passwordHash = hashPassword(body.password);
        if (db.prepare('SELECT 1 FROM customers WHERE email=? OR cpf=?').get(email,cpf)) fail('CONFLICT', 'Já existe uma conta com este e-mail ou CPF.');
        const id = 'CUS-' + randomUUID().toUpperCase();
        db.prepare('INSERT INTO customers (id,email,password_hash,first_name,last_name,age,cpf,phone,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,email,passwordHash,firstName,lastName,age,cpf,phone,new Date().toISOString());
        return issueSession(db,id,'cliente_conta');
      });
      res.status(201).json(session);
    } catch(error) { next(error); }
  });
  // O código UUID completo funciona como credencial da reserva; a equipe mantém senha.
  authRoute('guest', req => { const id = String(req.body.code ?? '').trim().toUpperCase(); const exists = /^FF-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/.test(id) && !!db.prepare('SELECT id FROM reservations WHERE id=?').get(id); return { id, codeExists: exists, role: 'cliente' }; });
  route('get', '/health', () => ({ status: 'ok', database: db.prepare('SELECT version FROM migrations ORDER BY version DESC LIMIT 1').get().version }));
  route('get', '/auth/session', req => { roles(req, 'cliente','cliente_conta','recepcao','garcom','cozinha'); return req.actor; });
  route('post', '/auth/logout', req => { const token = req.headers.authorization?.slice(7); if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); return { ok: true }; });
  route('get', '/menu', () => menu);
  route('get', '/customer/profile', req => { roles(req, 'cliente_conta'); const customer = db.prepare('SELECT id,email,first_name AS firstName,last_name AS lastName,age,cpf,phone,created_at AS createdAt FROM customers WHERE id=?').get(req.actor.principal); if (!customer) fail('NOT_FOUND','Cliente não encontrado.'); return customer; });
  route('get', '/customer/reservations', req => { roles(req, 'cliente_conta'); return readState(storage).reception.reservations.filter(reservation => reservation.customerId === req.actor.principal).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); });
  route('post', '/customer/reservations/link', req => {
    roles(req, 'cliente_conta');
    const id = String(req.body.code ?? '').trim().toUpperCase();
    const saved = db.prepare('SELECT customer_id FROM reservations WHERE id=?').get(id);
    if (!saved) fail('NOT_FOUND', 'Código de reserva não encontrado.');
    if (saved.customer_id && saved.customer_id !== req.actor.principal) fail('CONFLICT', 'Esta reserva já está vinculada a outra conta.');
    const state = readState(storage);
    const reservation = state.reception.reservations.find(item => item.id === id);
    if (!reservation) fail('NOT_FOUND', 'Código de reserva não encontrado.');
    reservation.customerId = req.actor.principal;
    writeState(state, storage);
    return { id: reservation.id, date: reservation.date, service: reservation.service, status: reservation.status };
  });
  route('get', '/testing/reservations', async () => {
    if (process.env.NODE_ENV === 'production') fail('NOT_FOUND', 'Página disponível somente no ambiente de desenvolvimento.');
    return (await reception.getReservations({ service: 'todos' })).filter(reservation => /^TESTE 27\/11 · /.test(reservation.guestName) && /^demo27\.[a-z]+@example\.test$/.test(reservation.email)).map(({ id, guestName, date, service, partySize }) => ({ id, guestName, date, service, partySize }));
  });
  route('get', '/services/availability', req => reservations.getAvailability(req.query));
  route('post', '/reservations', async req => {
    if (req.actor?.role === 'cliente_conta') req.body.customerId = req.actor.principal;
    const reservation = await reservations.confirm(req.body);
    return { ...reservation, session: issueSession(db, reservation.id, 'cliente') };
  });
  route('get', '/reservations', req => { roles(req, 'recepcao'); return reception.getReservations(req.query); });
  route('get', '/reservations/:id', req => { owner(req, req.params.id, 'recepcao'); return reservations.getReservation(req.params.id); });
  route('get', '/reservations/:id/status', req => { owner(req, req.params.id, 'recepcao'); return reception.getGuestStatus(req.params.id); });
  route('post', '/reservations/:id/cancel', req => { owner(req, req.params.id); return reservations.cancel(req.params.id); });
  route('post', '/waitlist', () => fail('INVALID_STATE', 'A lista de espera está desativada nesta versão. Escolha outro serviço.'));
  route('get', '/reception/operations', req => { roles(req, 'recepcao'); return reception.getOperations(); });
  route('post', '/reservations/:id/table', req => { roles(req, 'recepcao'); return reception.assignTable(req.params.id, req.body.tableId, 'recepcao'); });
  route('get', '/floor', req => { roles(req, 'garcom'); return reception.getFloor(); });
  route('post', '/floor/accommodations/:id', req => { roles(req, 'garcom'); return reception.confirmAssignedSeating(req.params.id, 'garcom'); });
  route('post', '/floor/tables/:id/ready', req => { roles(req, 'garcom'); return reception.markFloorTableReady(req.params.id, 'garcom'); });
  route('get', '/reception/progress', async req => { roles(req, 'recepcao'); return (await orders.getCommands()).map(command => ({ id: command.id, reservationId: command.reservationId, status: command.status, diningAt: command.diningAt, rounds: command.rounds.map(round => ({ status: round.status, readyAt: round.readyAt })), calls: command.calls?.map(call => ({ status: call.status })) ?? [] })); });
  route('patch', '/waitlist/:id', req => { roles(req, 'recepcao'); fail('INVALID_STATE', 'A lista de espera está desativada nesta versão.'); });
  route('put', '/reception/bar', req => { roles(req, 'recepcao'); return reception.setBarOccupancy(req.body.occupancy, 'recepcao'); });
  route('put', '/reception/bar/:id', req => { roles(req, 'recepcao'); return reception.setBarSeat(req.params.id, req.body.occupied, 'recepcao'); });
  for (const [path, action] of Object.entries({ 'check-in': req => {
    if (typeof req.body.parkingRequired !== 'boolean') fail('INVALID_INPUT', 'Informe o estacionamento.');
    return reception.registerArrival(req.params.id, 'recepcao', req.body.parkingRequired);
  }, wait: () => fail('INVALID_STATE', 'A espera está desativada. Selecione uma mesa pronta.'), departure: req => reception.registerDeparture(req.params.id, 'recepcao') })) {
    route('post', '/reservations/:id/' + path, req => { roles(req, 'recepcao'); return action(req); });
  }
  route('patch', '/reservations/:id/parking', req => { roles(req, 'recepcao'); return reception.updateParking(req.params.id, req.body.parkingRequired, 'recepcao'); });
  route('post', '/reservations/:id/accommodation', req => { roles(req, 'garcom'); return reception.confirmAssignedSeating(req.params.id, 'garcom'); });
  route('post', '/tables/:id/release', req => { roles(req, 'recepcao'); return reception.markTableReady(req.params.id, 'recepcao'); });
  route('get', '/tables', async req => {
    roles(req, 'recepcao','garcom','cozinha','cliente','cliente_conta');
    if (req.actor.role === 'recepcao') return reception.getTables();
    const tables = await orders.getTables();
    if (!['cliente','cliente_conta'].includes(req.actor.role)) return tables;
    const commands = (await orders.getCommands()).filter(c => req.actor.role === 'cliente' ? c.reservationId === req.actor.principal : readState(storage).reception.reservations.some(r => r.id === c.reservationId && r.customerId === req.actor.principal));
    return tables.filter(t => commands.some(c => c.tableId === t.id));
  });
  route('get', '/checks', async req => { roles(req, 'garcom','cozinha','cliente','cliente_conta'); const commands = await orders.getCommands(); return req.actor.role === 'cliente' ? commands.filter(c => c.reservationId === req.actor.principal) : req.actor.role === 'cliente_conta' ? commands.filter(c => readState(storage).reception.reservations.some(r => r.id === c.reservationId && r.customerId === req.actor.principal)) : commands; });
  route('get', '/checks/:id', req => check(req, req.params.id, 'garcom','cozinha'));
  route('post', '/checks/:id/payments', async req => {
    await check(req, req.params.id, 'garcom');
    return checkout.close(req.params.id, req.body, req.actor);
  });
  route('post', '/orders', async req => { await check(req, req.body.commandId, 'garcom'); return orders.createOrder(req.body.commandId, req.body.items, ['cliente','cliente_conta'].includes(req.actor.role) ? 'cliente' : 'garcom', { notes: req.body.notes }); });
  route('patch', '/rounds/:id', async req => {
    if (req.body.status === 'em_preparo') { roles(req, 'cozinha'); return orders.markRoundStarted(req.body.commandId, req.params.id); }
    if (req.body.status === 'pronto') { roles(req, 'cozinha'); return orders.markRoundReady(req.body.commandId, req.params.id); }
    if (req.body.status === 'entregue') {
      roles(req, 'garcom');
      const round = (await orders.getCommand(req.body.commandId))?.rounds.find(item => item.id === req.params.id);
      if (round && round.status !== 'entregue' && !round.readyAt) fail('INVALID_STATE', 'A cozinha precisa marcar o pedido como pronto antes da entrega.');
      return orders.deliverRound(req.body.commandId, req.params.id);
    }
    fail('INVALID_INPUT', 'Estado da rodada inválido.');
  });
  route('post', '/checks/:id/calls', async req => { await check(req, req.params.id); return orders.callWaiter(req.params.id, req.body.type); });
  route('post', '/checks/:id/dining', req => { roles(req, 'garcom'); return orders.markDining(req.params.id); });
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

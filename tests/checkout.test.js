import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { checkoutSummary } from '../src/lib/billing.js';
import { readState, writeState } from '../src/services/localStore.js';

const PASSWORD = 'Checkout-test-password-2026';
const now = () => new Date('2026-11-24T10:00:00-03:00');
async function fixture(t) {
  const folder = await mkdtemp(join(tmpdir(), 'food-flow-checkout-'));
  const filename = join(folder, 'test.sqlite');
  let instance = createApp({ filename, now, serveStatic: false });
  for (const [id, role] of [['rec', 'recepcao'], ['waiter', 'garcom'], ['kitchen', 'cozinha']]) {
    instance.db.prepare('INSERT INTO users VALUES(?,?,?)').run(id, hashPassword(PASSWORD), role);
  }
  let server = instance.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); instance.close(); });
  async function api(method, path, body, token, key) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      signal: AbortSignal.timeout(10_000),
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const tokens = {};
  for (const id of ['rec', 'waiter', 'kitchen']) {
    const result = await api('POST', '/auth/staff', { registration: id, password: PASSWORD });
    assert.equal(result.status, 200); tokens[id] = result.data.token;
  }
  async function seat(tableId = 1) {
    const created = await api('POST', '/reservations', { date: '2026-11-25', service: '17:45', tableCategory: 2, partySize: 2, guestName: 'Cliente fechamento', whatsapp: '81999998888', email: 'checkout@example.test', password: PASSWORD, paymentStatus: 'aprovado' });
    assert.equal(created.status, 200);
    const reservation = created.data;
    assert.equal((await api('POST', `/reservations/${reservation.id}/check-in`, { parkingRequired: false }, tokens.rec)).status, 200);
    const seated = await api('POST', `/reservations/${reservation.id}/accommodation`, { tableId }, tokens.rec);
    assert.equal(seated.status, 200);
    return { reservation, command: seated.data.command, token: reservation.session.token };
  }
  async function order(c, productId = 'PRI001') {
    const result = await api('POST', '/orders', { commandId: c.command.id, items: [{ productId, quantity: 1 }] }, c.token);
    assert.equal(result.status, 200); return result.data;
  }
  async function deliver(c, round) {
    assert.equal((await api('PATCH', `/rounds/${round.id}`, { commandId: c.command.id, status: 'pronto' }, tokens.kitchen)).status, 200);
    assert.equal((await api('PATCH', `/rounds/${round.id}`, { commandId: c.command.id, status: 'entregue' }, tokens.waiter)).status, 200);
  }
  async function body(c, method = 'pix') {
    const result = await api('GET', `/checks/${c.command.id}`, null, c.token);
    assert.equal(result.status, 200);
    const summary = checkoutSummary(result.data);
    return { method, paymentStatus: 'aprovado', expectedTotalCents: summary.totalCents, expectedCreditCents: summary.creditCents };
  }
  return { api, tokens, seat, order, deliver, body, get instance() { return instance; }, async restart() {
    await new Promise(resolve => server.close(resolve)); instance.close();
    instance = createApp({ filename, now, serveStatic: false });
    server = instance.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  } };
}

test('fechamento HTTP abate crédito uma vez, persiste e integra saída, limpeza e reutilização física', async t => {
  const f = await fixture(t), c = await f.seat();
  await f.deliver(c, await f.order(c));
  const payload = await f.body(c);
  const result = await f.api('POST', `/checks/${c.command.id}/payments`, { ...payload, amountCents: 1, role: 'garcom' }, c.token, 'payment-one');
  assert.equal(result.status, 200);
  assert.equal(result.data.settlement.channel, 'digital');
  assert.equal(result.data.settlement.totalCents, 10788);
  assert.equal(result.data.settlement.appliedCreditCents, 5000);
  assert.equal(result.data.settlement.amountCents, 5788);
  const replay = await f.api('POST', `/checks/${c.command.id}/payments`, { ...payload, amountCents: 1, role: 'garcom' }, c.token, 'payment-one');
  assert.equal(replay.data.settlement.reference, result.data.settlement.reference);
  assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token)).status, 409);
  assert.equal((await f.api('POST', '/orders', { commandId: c.command.id, items: [{ productId: 'PRI001', quantity: 1 }] }, c.token)).status, 422);
  assert.equal((await f.api('PATCH', `/reservations/${c.reservation.id}/parking`, { parkingRequired: true }, f.tokens.rec)).status, 422);
  assert.equal((await f.api('POST', '/tables/1/release', {}, f.tokens.rec)).status, 422);
  await f.restart();
  const saved = await f.api('GET', `/checks/${c.command.id}`, null, c.token);
  assert.equal(saved.data.status, 'fechada');
  assert.equal(saved.data.settlement.reference, result.data.settlement.reference);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM check_credits').get().n, 1);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM settlements').get().n, 1);
  assert.equal((await f.api('POST', `/reservations/${c.reservation.id}/departure`, {}, f.tokens.rec)).status, 200);
  assert.equal((await f.api('GET', '/tables', null, f.tokens.rec)).data[0].status, 'aguardando_limpeza');
  assert.equal((await f.api('POST', '/tables/1/release', {}, f.tokens.rec)).status, 200);
  assert.equal((await f.api('GET', '/tables', null, f.tokens.rec)).data[0].status, 'pronta');
  const next = await f.seat();
  assert.notEqual(next.command.id, c.command.id);
});

test('pagamento bloqueia itens pendentes, recusa e resumo desatualizado sem aplicar crédito', async t => {
  const f = await fixture(t), c = await f.seat(), round = await f.order(c);
  const payload = await f.body(c);
  assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token)).status, 422);
  await f.deliver(c, round);
  const refused = await f.api('POST', `/checks/${c.command.id}/payments`, { ...payload, paymentStatus: 'recusado' }, c.token);
  assert.equal(refused.data.code, 'PAYMENT_DECLINED');
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM check_credits').get().n, 0);
  const nextRound = await f.order(c);
  await f.deliver(c, nextRound);
  assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token)).status, 409);
  assert.equal((await f.api('GET', `/checks/${c.command.id}`, null, c.token)).data.status, 'aberta');
});

test('liquidação digital e presencial concorrentes aceitam somente um fechamento', async t => {
  const f = await fixture(t), c = await f.seat();
  await f.deliver(c, await f.order(c));
  const payload = await f.body(c);
  const results = await Promise.all([
    f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token, 'digital'),
    f.api('POST', `/checks/${c.command.id}/payments`, { ...payload, method: 'dinheiro' }, f.tokens.waiter, 'presencial'),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM settlements').get().n, 1);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM check_credits').get().n, 1);
});

test('saldo inferior exige atendimento sem liquidação; sem consumo encerra presencial e retém taxa', async t => {
  const f = await fixture(t), low = await f.seat();
  await f.deliver(low, await f.order(low, 'BEB001'));
  const payload = await f.body(low);
  for (const [token, method] of [[low.token, 'pix'], [f.tokens.waiter, 'dinheiro']]) {
    const result = await f.api('POST', `/checks/${low.command.id}/payments`, { ...payload, method }, token);
    assert.equal(result.data.code, 'MANUAL_REQUIRED');
  }
  assert.equal((await f.api('POST', `/checks/${low.command.id}/calls`, { type: 'fechamento_presencial' }, low.token)).status, 200);
  const empty = await f.seat(2), emptyBody = await f.body(empty, 'sem_consumo');
  assert.equal((await f.api('POST', `/checks/${empty.command.id}/payments`, emptyBody, empty.token)).status, 400);
  const closed = await f.api('POST', `/checks/${empty.command.id}/payments`, emptyBody, f.tokens.waiter);
  assert.equal(closed.status, 200);
  assert.equal(closed.data.settlement.status, 'sem_consumo');
  assert.equal(closed.data.settlement.amountCents, 0);
  assert.equal(closed.data.settlement.retainedReservationCents, 5000);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM check_credits').get().n, 0);
});

test('fechamento valida proprietário e perfil e reverte snapshot se ledger falhar', async t => {
  const f = await fixture(t), c = await f.seat(), other = await f.seat(2);
  await f.deliver(c, await f.order(c));
  const payload = await f.body(c);
  assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload)).status, 401);
  for (const token of [other.token, f.tokens.rec, f.tokens.kitchen]) {
    assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload, token)).status, 403);
  }
  f.instance.db.exec("CREATE TRIGGER reject_settlement BEFORE INSERT ON settlements BEGIN SELECT RAISE(ABORT,'test ledger failure'); END");
  assert.notEqual((await f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token)).status, 200);
  assert.equal((await f.api('GET', `/checks/${c.command.id}`, null, c.token)).data.status, 'aberta');
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM check_credits').get().n, 0);
  assert.equal(f.instance.db.prepare('SELECT count(*) n FROM settlements').get().n, 0);
  f.instance.db.exec('DROP TRIGGER reject_settlement');
  // Item pendente não pode ser ocultado apenas alterando o estado da rodada.
  await f.instance.transaction(() => { const state = readState(f.instance.storage); state.orders.commands[0].rounds[0].items[0].status = 'em preparo'; writeState(state, f.instance.storage); });
  assert.equal((await f.api('POST', `/checks/${c.command.id}/payments`, payload, c.token)).status, 422);
});

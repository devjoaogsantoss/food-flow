import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceptionApi } from '../src/services/receptionApi.js';
import { createOrdersApi } from '../src/services/ordersApi.js';
import { readState, writeState, STATE_KEY } from '../src/services/localStore.js';
import { arrivalDelayMinutes } from '../src/lib/reception.js';
import { createHttpClient } from '../src/services/httpClient.js';
import { createHttpModules } from '../src/services/httpModules.js';
async function setup() {
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) };
  const reception = createReceptionApi({ storage, now: () => new Date('2026-11-24T17:00:00-03:00') });
  const orders = createOrdersApi({ storage });
  await reception.registerArrival('FF-0001', 'recepcao', false);
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  return { storage, reception, orders, command };
}
test('fechamento presencial e atendimento são chamados distintos e idempotentes', async () => {
  const { orders, command } = await setup();
  const help = await orders.callWaiter(command.id);
  const calls = await Promise.all([orders.callWaiter(command.id, 'fechamento_presencial'), orders.callWaiter(command.id, 'fechamento_presencial')]);
  assert.equal(calls[0].id, calls[1].id);
  assert.notEqual(help.id, calls[0].id);
  await orders.attendCall(command.id, calls[0].id);
  const saved = await orders.getCommand(command.id);
  assert.equal(saved.status, 'aberta');
  assert.equal(saved.calls.find(c => c.id === help.id).status, 'pendente');
  await assert.rejects(() => orders.callWaiter(command.id, 'pagar'));
});
test('contrato de Israel: fechamento impede alteração financeira e permite consulta e saída', async () => {
  const { storage, reception, orders, command } = await setup();
  // Simula somente a saída do módulo de Israel; não é um pagamento implementado.
  const state = readState(storage);
  state.orders.commands[0].status = 'fechada';
  writeState(state, storage);
  const before = storage.getItem(STATE_KEY);
  await assert.rejects(() => reception.updateParking('FF-0001', true, 'recepcao'), { code: 'INVALID_STATE' });
  assert.equal(storage.getItem(STATE_KEY), before);
  const guest = await reception.getGuestStatus('FF-0001');
  assert.equal(guest.canViewCommand, true);
  assert.equal(guest.canOrder, false);
  await assert.rejects(() => orders.callWaiter(command.id, 'fechamento_presencial'));
  await reception.registerDeparture('FF-0001', 'recepcao');
  assert.equal((await reception.getTables())[0].status, 'aguardando_limpeza');
  await reception.markTableReady(1, 'recepcao');
  assert.equal((await reception.getTables())[0].status, 'pronta');
  assert.equal((await reception.getGuestStatus('FF-0001')).canViewCommand, true);
});
test('atraso usa instante do serviço em São Paulo sem cancelar a reserva', () => {
  const reservation = { date: '2026-11-24', service: '17:45', status: 'reservada' };
  assert.equal(arrivalDelayMinutes(reservation, new Date('2026-11-24T21:00:00Z')), 15);
  assert.equal(arrivalDelayMinutes(reservation, new Date('2026-11-24T20:44:00Z')), 0);
  assert.equal(arrivalDelayMinutes({ ...reservation, status: 'chegou' }, new Date('2026-11-24T21:00:00Z')), 0);
  assert.equal(reservation.status, 'reservada');
});
test('HTTP codifica entrada e preserva sessão, erro e idempotência sem retentar mutações', async () => {
  const calls = [];
  const request = createHttpClient({ baseUrl: '/api/', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ code: 'CONFLICT', message: 'Última vaga ocupada' }), { status: 409 });
  } });
  const api = createHttpModules(request);
  await assert.rejects(() => api.reservations.confirm({ guestName: 'Ana' }, 'same-operation'), { code: 'CONFLICT', status: 409 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/reservations');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'same-operation');
  assert.deepEqual(JSON.parse(calls[0].options.body), { guestName: 'Ana' });
});
test('HTTP consulta codificada, retorno vazio e resposta malformada', async () => {
  let url;
  const api = createHttpModules(createHttpClient({ baseUrl: '/api', fetchImpl: async (value) => {
    url = value; return new Response(JSON.stringify({ available: true }));
  } }));
  assert.deepEqual(await api.reservations.getAvailability({ service: '17:45', extra: 'a&b' }), { available: true });
  assert.equal(new URL(url, 'https://example.test').searchParams.get('extra'), 'a&b');
  await api.reservations.getReservation('FF/a?b');
  assert.equal(url, '/api/reservations/FF%2Fa%3Fb');
  const empty = createHttpClient({ baseUrl: '/api', fetchImpl: async () => new Response(null, { status: 204 }) });
  assert.equal(await empty('POST', '/operation'), null);
  const malformed = createHttpClient({ baseUrl: '/api', fetchImpl: async () => new Response('<html>') });
  await assert.rejects(() => malformed('GET', '/operation'), { code: 'INVALID_RESPONSE' });
});
test('HTTP timeout cancela requisição sem repetir reserva', async () => {
  let count = 0;
  const request = createHttpClient({ baseUrl: '/api', timeoutMs: 10, fetchImpl: (_url, { signal }) => {
    count++;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  } });
  await assert.rejects(() => request('POST', '/reservations'), { name: 'AbortError' });
  assert.equal(count, 1);
});

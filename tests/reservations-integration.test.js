import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservationsApi } from '../src/services/reservationsApi.js';
import { createReceptionApi } from '../src/services/receptionApi.js';
import { createOrdersApi } from '../src/services/ordersApi.js';
import { readState, writeState } from '../src/services/localStore.js';
import { menu } from '../src/lib/menu.js';

function setup(time = '2026-11-24T12:00:00-03:00') {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const now = () => new Date(time);
  return { storage, now, api: createReservationsApi({ storage, now }), reception: createReceptionApi({ storage, now }), orders: createOrdersApi({ storage }) };
}
const input = { date: '2026-11-26', service: '20:00', tableCategory: 8, partySize: 5,
  guestName: 'Pessoa Teste', whatsapp: '11999999999', email: 'teste@example.com', paymentStatus: 'aprovado' };

test('reserva pública conecta recepção, comanda, crédito e pedidos dos dois canais', async () => {
  const { api, reception, orders, storage, now } = setup();
  const reservation = await api.confirm(input);
  assert.equal(reservation.payment.amountCents, 20000);
  assert.equal((await reception.getReservations({ date: input.date })).length, 1);
  assert.equal((await createReservationsApi({ storage, now }).getReservation(reservation.id.toLowerCase())).id, reservation.id);
  await assert.rejects(orders.createOrder(101, [{ productId: menu[0].id, quantity: 1 }], 'cliente'));
  await reception.registerArrival(reservation.id, 'recepcao', false);
  const { command } = await reception.confirmSeating(reservation.id, 17, 'recepcao');
  assert.deepEqual(command.reservationPayment, reservation.payment);
  assert.equal(command.partySize, 5);
  for (const source of ['cliente', 'garcom'])
    await orders.createOrder(command.id, [{ productId: menu.find(p => p.available && p.kind !== 'degustacao').id, quantity: 1 }], source);
  assert.equal((await orders.getCommand(command.id)).rounds.length, 2);
  await assert.rejects(api.cancel(reservation.id), { code: 'INVALID_STATE' });
});

test('capacidade por serviço/categoria e disputa local da última vaga', async () => {
  const { api, storage, now } = setup();
  assert.equal((await api.getAvailability(input)).remaining, 2);
  await api.confirm(input);
  const secondApi = createReservationsApi({ storage, now });
  const results = await Promise.allSettled([api.confirm(input), secondApi.confirm(input)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
  const full = await api.getAvailability(input);
  assert.equal(full.remaining, 0);
  assert.equal(full.suggestions.length, 3);
  assert.equal((await api.getAvailability({ ...input, service: '17:45' })).remaining, 2);
  assert.equal((await api.getAvailability({ ...input, tableCategory: 4 })).remaining, 6);
  assert.equal((await api.getAvailability({ ...input, tableCategory: 2 })).remaining, 10);
  assert.equal(readState(storage).reception.reservations.filter(r => r.date === input.date).length, 2);
});

test('lista pública não cobra, não reserva e aparece na operação da recepção', async () => {
  const { api, reception, orders } = setup();
  await assert.rejects(api.joinWaitlist(input), { code: 'INVALID_STATE' });
  await api.confirm(input); await api.confirm(input);
  const before = await api.getAvailability(input);
  const entry = await api.joinWaitlist(input);
  assert.equal(entry.status, 'aguardando');
  assert.equal(entry.payment, undefined);
  assert.equal((await reception.getOperations()).waitlist[0].id, entry.id);
  assert.equal((await api.getAvailability(input)).remaining, before.remaining);
  assert.equal((await orders.getCommands()).length, 0);
  await assert.rejects(api.joinWaitlist({ ...input, whatsapp: '(11) 99999-9999' }), { code: 'CONFLICT' });
});

test('cancelamento no limite de 12h reembolsa e devolve disponibilidade uma única vez', async () => {
  const { api, reception } = setup('2026-11-26T08:00:00-03:00');
  const initialRemaining = (await api.getAvailability(input)).remaining;
  const saved = await api.confirm(input);
  const cancelled = await api.cancel(saved.id);
  assert.equal(cancelled.refund.amountCents, 20000);
  assert.equal(cancelled.refund.eligible, true);
  assert.deepEqual(await api.cancel(saved.id), cancelled);
  assert.equal((await api.getAvailability(input)).remaining, initialRemaining);
  await assert.rejects(reception.registerArrival(saved.id, 'recepcao', false), { code: 'INVALID_STATE' });
  assert.equal((await reception.getGuestStatus(saved.id)).title, 'Reserva cancelada');
});

test('menos de 12h cancela sem reembolso; valor vem do registro, não da entrada', async () => {
  const { api } = setup('2026-11-26T08:00:01-03:00');
  const saved = await api.confirm({ ...input, payment: { amountCents: 1 }, tableCategory: 2, partySize: 1 });
  assert.equal(saved.payment.amountCents, 5000);
  assert.equal((await api.cancel(saved.id)).refund.amountCents, 0);
});

test('rejeita pagamento recusado, datas/serviços/categorias inválidos e excesso de pessoas', async () => {
  const { api, storage } = setup();
  for (const change of [
    { paymentStatus: 'recusado' }, { date: '2026-11-23' }, { date: '2026-11-29' },
    { date: '2026-02-30' }, { service: '12:00' }, { tableCategory: 3 },
    { partySize: 9 }, { partySize: 0 }, { guestName: '' }, { email: 'inválido' }, { whatsapp: '123' }, { whatsapp: '..........' },
    { date: '2026-11-24', service: '17:45' },
  ]) {
    const current = change.date === '2026-11-24' ? createReservationsApi({ storage, now: () => new Date('2026-11-24T18:00:00-03:00') }) : api;
    await assert.rejects(current.confirm({ ...input, ...change }));
  }
  assert.equal(storage.getItem('food-flow-state-v1'), null);
});

test('falha na gravação preserva reserva anterior e não confirma inscrição/reserva', async () => {
  const { api, storage } = setup();
  await api.confirm(input);
  const before = storage.getItem('food-flow-state-v1');
  storage.setItem = () => { throw new Error('Sem espaço'); };
  await assert.rejects(api.confirm(input), /Sem espaço/);
  assert.equal(storage.getItem('food-flow-state-v1'), before);
});

test('comanda fechada recusa pedidos, preparo, entrega e atendimento de chamada', async () => {
  const { api, reception, orders, storage } = setup();
  const r = await api.confirm(input);
  await reception.registerArrival(r.id, 'recepcao', false);
  const { command } = await reception.confirmSeating(r.id, 17, 'recepcao');
  const round = await orders.createOrder(command.id, [{ productId: 'PRI001', quantity: 1 }], 'garcom');
  const call = await orders.callWaiter(command.id);
  const state = readState(storage);
  state.orders.commands[0].status = 'fechada'; // contrato simulado de Israel
  writeState(state, storage);
  await assert.rejects(orders.createOrder(command.id, [{ productId: 'PRI001', quantity: 1 }], 'garcom'));
  await assert.rejects(orders.deliverRound(command.id, round.id));
  await assert.rejects(orders.markRoundReady(command.id, round.id));
  await assert.rejects(orders.attendCall(command.id, call.id));
});

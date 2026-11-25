import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceptionApi, buildSeed } from '../src/services/receptionApi.js';
import { createOrdersApi } from '../src/services/ordersApi.js';
import {
  STATE_KEY,
  ORDERS_KEY,
  RECEPTION_KEY,
  readState,
  writeState,
} from '../src/services/localStore.js';
import { resolvePage } from '../src/lib/routes.js';

const now = () => new Date('2026-11-20T18:00:00-03:00');
function setup(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
  return {
    storage,
    reception: createReceptionApi({ storage, now }),
    orders: createOrdersApi({ storage }),
  };
}

test('preserva /pedidos e aceita novas rotas, barras finais e hashes antigos', () => {
  assert.equal(resolvePage('/'), 'home');
  assert.equal(resolvePage('/', '#reservas'), 'home');
  assert.equal(resolvePage('/pedidos/', '#recepcao'), 'orders');
  assert.equal(resolvePage('/recepcao/'), 'reception');
  assert.equal(resolvePage('/minha-reserva'), 'client');
  assert.equal(resolvePage('/', '#recepcao'), 'reception');
  assert.equal(resolvePage('/', '#minha-reserva'), 'client');
  assert.equal(resolvePage('/cliente/conta'), 'client');
  assert.equal(resolvePage('/cliente/reservar'), 'booking');
  assert.equal(resolvePage('/admin/salao'), 'waiter');
  assert.equal(resolvePage('/admin/recepcao'), 'reception');
});

test('ambos os canais pedem na comanda acomodada e sobrevivem à recriação das APIs', async () => {
  const { storage, reception, orders } = setup();
  assert.equal((await orders.getCommands()).length, 0);
  assert.equal((await orders.getTables()).length, 18);
  await reception.registerArrival('FF-0001', 'recepcao');
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  await Promise.all([
    orders.createOrder(
      command.id,
      [{ productId: 'PRI001', quantity: 2 }],
      'cliente',
    ),
    orders.createOrder(
      command.id,
      [{ productId: 'ENT003', quantity: 1 }],
      'garcom',
    ),
  ]);
  const recreated = createOrdersApi({ storage });
  const saved = await recreated.getCommand(command.id);
  assert.equal(saved.rounds.length, 2);
  assert.deepEqual(
    saved.rounds.map((round) => round.source),
    ['cliente', 'garcom'],
  );
  assert.equal(saved.rounds[0].items[0].price, 89.9);
  await recreated.deliverRound(command.id, saved.rounds[0].id);
  assert.equal(
    (await orders.getCommand(command.id)).rounds[0].status,
    'entregue',
  );
});

test('migra o legado sem perder rodadas nem alterar as chaves antigas', async () => {
  const legacy = JSON.stringify({
    tables: [
      { id: 1, number: 1, capacity: 4, status: 'aberta', commandId: 101 },
    ],
    commands: [
      {
        id: 101,
        tableId: 1,
        status: 'aberta',
        rounds: [{ id: 'old', status: 'entregue', items: [] }],
        tasting: null,
      },
    ],
  });
  const { storage, reception, orders } = setup({ [ORDERS_KEY]: legacy });
  await reception.registerArrival('FF-0001', 'recepcao');
  assert.equal(storage.getItem(ORDERS_KEY), legacy);
  const tables = await orders.getTables();
  assert.equal(tables[0].capacity, 2);
  assert.equal(tables[0].legacyCapacity, 4);
  assert.equal((await reception.getTables())[0].status, 'ocupada');
  await assert.rejects(() =>
    reception.confirmSeating('FF-0001', 1, 'recepcao'),
  );
  await reception.confirmSeating('FF-0001', 2, 'recepcao');
  assert.equal((await orders.getCommand(101)).rounds[0].id, 'old');
  await assert.rejects(() =>
    orders.createOrder(101, [{ productId: 'PRI001', quantity: 1 }], 'cliente'),
  );
});

test('importa recepção existente preservando reserva, mesa, comanda e campos extras', async () => {
  const seed = buildSeed('2026-11-20');
  Object.assign(seed.reservations[0], {
    status: 'acomodada',
    tableId: 1,
    commandId: 103,
  });
  const legacyReception = JSON.stringify({ ...seed, note: 'preservar' });
  const legacyOrders = JSON.stringify({
    tables: [{ id: 1, capacity: 2, status: 'aberta', commandId: 103 }],
    commands: [
      {
        id: 103,
        tableId: 1,
        reservationId: 'FF-0001',
        status: 'aberta',
        rounds: [],
        tasting: null,
      },
    ],
  });
  const { reception, storage } = setup({
    [RECEPTION_KEY]: legacyReception,
    [ORDERS_KEY]: legacyOrders,
  });
  const repeated = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  assert.equal(repeated.changed, false);
  assert.equal(repeated.command.id, 103);
  await reception.setBarOccupancy(4, 'recepcao');
  assert.equal(readState(storage).reception.note, 'preservar');
  assert.equal(storage.getItem(RECEPTION_KEY), legacyReception);
});

test('dados inválidos e falha de gravação não são substituídos nem deixam meia acomodação', async () => {
  const broken = setup({ [ORDERS_KEY]: '{invalid' });
  await assert.rejects(
    () => broken.reception.registerArrival('FF-0001', 'recepcao'),
    { code: 'STORAGE_ERROR' },
  );
  assert.equal(broken.storage.getItem(ORDERS_KEY), '{invalid');
  assert.equal(broken.storage.getItem(STATE_KEY), null);
  const { reception, storage } = setup();
  await reception.registerArrival('FF-0001', 'recepcao');
  const previous = storage.getItem(STATE_KEY);
  storage.setItem = () => {
    throw new Error('QuotaExceeded');
  };
  await assert.rejects(
    () => reception.confirmSeating('FF-0001', 1, 'recepcao'),
    /QuotaExceeded/,
  );
  assert.equal(storage.getItem(STATE_KEY), previous);
  assert.equal(readState(storage).orders.commands.length, 0);
  assert.equal(readState(storage).reception.reservations[0].status, 'chegou');
});

test('não permite pedido de reserva que perdeu a acomodação', async () => {
  const { reception, orders, storage } = setup();
  await reception.registerArrival('FF-0001', 'recepcao');
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  const state = readState(storage);
  state.reception.reservations[0].status = 'em_espera';
  writeState(state, storage);
  await assert.rejects(
    () =>
      orders.createOrder(
        command.id,
        [{ productId: 'PRI001', quantity: 1 }],
        'cliente',
      ),
    /acomodação/,
  );
  assert.equal((await orders.getCommand(command.id)).rounds.length, 0);
});

test('limita bar, separa lista de espera e não cria reserva ou comanda por inscrição', async () => {
  const { reception, orders } = setup();
  await assert.rejects(() => reception.setBarOccupancy(21, 'recepcao'));
  await assert.rejects(() => reception.setBarOccupancy(2, 'garcom'), {
    code: 'FORBIDDEN',
  });
  await reception.setBarOccupancy(20, 'recepcao');
  const entry = {
    guestName: 'Teste',
    tableCategory: 2,
    date: '2026-11-20',
    service: '20:00',
    whatsapp: '00000000000',
    email: 'teste@example.com',
  };
  const added = await reception.addWaitlistEntry(entry, 'recepcao');
  await assert.rejects(() => reception.addWaitlistEntry(entry, 'recepcao'), {
    code: 'CONFLICT',
  });
  await assert.rejects(() =>
    reception.addWaitlistEntry({ ...entry, date: '2026-11-22' }, 'recepcao'),
  );
  await reception.updateWaitlistEntry(added.entry.id, 'contatado', 'recepcao');
  const operations = await reception.getOperations();
  assert.equal(operations.barOccupancy, 20);
  assert.equal(operations.waitlist[0].status, 'contatado');
  assert.equal((await reception.getReservations()).length, 7);
  assert.equal((await orders.getCommands()).length, 0);
});

test('saída bloqueada até fechamento; após contrato de fechamento, limpa e reutiliza mesa', async () => {
  const { reception, orders, storage } = setup();
  await reception.registerArrival('FF-0001', 'recepcao');
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  await orders.createOrder(
    command.id,
    [{ productId: 'PRI001', quantity: 1 }],
    'cliente',
  );
  await assert.rejects(
    () => reception.registerDeparture('FF-0001', 'recepcao'),
    /encerrada/,
  );
  const state = readState(storage);
  state.orders.commands[0].status = 'fechada'; // Simula o contrato futuro de Israel, não um pagamento real.
  writeState(state, storage);
  await assert.rejects(
    () => reception.registerDeparture('FF-0001', 'recepcao'),
    /rodadas/,
  );
  state.orders.commands[0].rounds[0].status = 'entregue';
  writeState(state, storage);
  assert.equal((await reception.getGuestStatus('FF-0001')).canOrder, false);
  await reception.registerDeparture('FF-0001', 'recepcao');
  assert.equal((await reception.getTables())[0].status, 'aguardando_limpeza');
  await assert.rejects(() => reception.registerWait('FF-0001', 1, 'recepcao'));
  await assert.rejects(() =>
    reception.confirmSeating('FF-0001', 1, 'recepcao'),
  );
  await reception.markTableReady(1, 'recepcao');
  await reception.registerArrival('FF-0003', 'recepcao');
  await reception.confirmSeating('FF-0003', 1, 'recepcao');
  assert.equal((await orders.getCommands()).length, 2);
});

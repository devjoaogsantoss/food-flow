import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SERVICES,
  filterReservations,
  groupReservations,
  normalizeText,
} from '../src/lib/reception.js';
import {
  ORDERS_KEY,
  buildSeed,
  createReceptionApi,
} from '../src/services/receptionApi.js';
import { readState } from '../src/services/localStore.js';

const TODAY = '2026-11-12';
const NOW = () => new Date('2026-11-12T18:00:00.000Z');

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

function setup() {
  const storage = memoryStorage();
  const api = createReceptionApi({ storage, now: NOW });
  const orders = () => readState(storage).orders;
  return { storage, api, orders };
}

const R = 'recepcao';

test('busca ignora acento e caixa, por nome ou identificador', () => {
  const { reservations } = buildSeed(TODAY);
  assert.equal(normalizeText('Fábio'), 'fabio');
  const byName = filterReservations(reservations, {
    date: TODAY,
    query: 'FABIO',
  });
  assert.deepEqual(
    byName.map((item) => item.id),
    ['FF-0006'],
  );
  const byId = filterReservations(reservations, {
    date: TODAY,
    query: 'ff-0003',
  });
  assert.deepEqual(
    byId.map((item) => item.guestName),
    ['Carla Mendes'],
  );
});

test('filtra por dia e serviço; a busca procura no dia inteiro', () => {
  const { reservations } = buildSeed(TODAY);
  const service = filterReservations(reservations, {
    date: TODAY,
    service: '20:00',
  });
  assert.equal(service.length, 3);
  const all = filterReservations(reservations, {
    date: TODAY,
    service: ALL_SERVICES,
  });
  assert.equal(all.length, 6);
  const searched = filterReservations(reservations, {
    date: TODAY,
    service: '20:00',
    query: 'ana',
  });
  assert.deepEqual(
    searched.map((item) => item.id),
    ['FF-0001'],
  );
});

test('recepção é a única que registra chegada', async () => {
  const { api } = setup();
  await assert.rejects(() => api.registerArrival('FF-0001', 'garcom'), {
    code: 'FORBIDDEN',
  });
  await assert.rejects(() => api.registerArrival('FF-0001', 'cliente'), {
    code: 'FORBIDDEN',
  });
});

test('repetir a chegada não registra duas vezes', async () => {
  const { api } = setup();
  const first = await api.registerArrival('FF-0001', R);
  const second = await api.registerArrival('FF-0001', R);
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(second.reservation.arrivedAt, first.reservation.arrivedAt);
});

test('separa reserva, chegada e acomodação', async () => {
  const { api } = setup();
  await api.registerArrival('FF-0001', R);
  await api.registerArrival('FF-0002', R);
  await api.confirmSeating('FF-0001', 1, R);
  const groups = groupReservations(await api.getReservations({ date: TODAY }));
  assert.deepEqual(
    groups.reserved.map((item) => item.id),
    ['FF-0003', 'FF-0004', 'FF-0005', 'FF-0006'],
  );
  assert.deepEqual(
    groups.arrived.map((item) => item.id),
    ['FF-0002'],
  );
  assert.deepEqual(
    groups.seated.map((item) => item.id),
    ['FF-0001'],
  );
});

test('não acomoda quem ainda não chegou', async () => {
  const { api, storage } = setup();
  await assert.rejects(() => api.confirmSeating('FF-0001', 1, R), {
    code: 'INVALID_STATE',
  });
  assert.equal(storage.getItem(ORDERS_KEY), null);
});

test('mesa não pronta: registra espera e o responsável vê o aviso', async () => {
  const { api } = setup();
  await api.registerArrival('FF-0003', R);
  // Mesa 3 (2 lugares) está aguardando limpeza no seed.
  const wait = await api.registerWait('FF-0003', 3, R);
  assert.equal(wait.reservation.status, 'em_espera');
  assert.equal(wait.reservation.waitingTableId, 3);
  const guest = await api.getGuestStatus('ff-0003');
  assert.equal(guest.canOrder, false);
  assert.match(guest.message, /lounge ou no bar/);
});

test('repetir a espera não muda o horário em que ela começou', async () => {
  const { api } = setup();
  await api.registerArrival('FF-0003', R);
  const first = await api.registerWait('FF-0003', 3, R);
  const second = await api.registerWait('FF-0003', 3, R);
  assert.equal(second.changed, false);
  assert.equal(second.reservation.waitingSince, first.reservation.waitingSince);
});

test('não registra espera se a mesa já está pronta', async () => {
  const { api } = setup();
  await api.registerArrival('FF-0001', R);
  await assert.rejects(() => api.registerWait('FF-0001', 1, R), {
    code: 'INVALID_STATE',
  });
});

test('mesa não pronta bloqueia a acomodação até ser liberada', async () => {
  const { api, storage } = setup();
  await api.registerArrival('FF-0003', R);
  await api.registerWait('FF-0003', 3, R);
  await assert.rejects(() => api.confirmSeating('FF-0003', 3, R), {
    code: 'INVALID_STATE',
  });
  assert.equal(storage.getItem(ORDERS_KEY), null);
  await api.markTableReady(3, R);
  const seated = await api.confirmSeating('FF-0003', 3, R);
  assert.equal(seated.reservation.status, 'acomodada');
});

test('só a acomodação abre a comanda, ligada à mesa e à reserva', async () => {
  const { api, orders, storage } = setup();
  await api.registerArrival('FF-0001', R);
  assert.equal(storage.getItem(ORDERS_KEY), null);
  const before = await api.getGuestStatus('FF-0001');
  assert.equal(before.canOrder, false);

  const { command } = await api.confirmSeating('FF-0001', 1, R);
  const saved = orders();
  assert.equal(saved.commands.length, 1);
  assert.equal(command.reservationId, 'FF-0001');
  assert.equal(command.tableId, 1);
  assert.equal(command.status, 'aberta');
  assert.deepEqual(command.rounds, []);
  assert.equal(saved.tables.length, 18);
  assert.deepEqual(saved.tables[0], {
    id: 1,
    number: 1,
    capacity: 2,
    status: 'aberta',
    commandId: command.id,
  });

  const after = await api.getGuestStatus('FF-0001');
  assert.equal(after.canOrder, true);
  assert.equal(after.commandId, command.id);
  assert.equal(after.table.number, 1);
});

test('repetir ou disparar duas vezes a acomodação abre uma só comanda', async () => {
  const { api, orders } = setup();
  await api.registerArrival('FF-0001', R);
  const [a, b] = await Promise.all([
    api.confirmSeating('FF-0001', 1, R),
    api.confirmSeating('FF-0001', 1, R),
  ]);
  const c = await api.confirmSeating('FF-0001', 1, R);
  assert.equal(orders().commands.length, 1);
  assert.equal(a.command.id, b.command.id);
  assert.equal(a.command.id, c.command.id);
  assert.equal([a, b, c].filter((item) => item.changed).length, 1);
});

test('duas reservas disputando a mesma mesa: só a primeira senta', async () => {
  const { api, orders } = setup();
  await api.registerArrival('FF-0001', R);
  await api.registerArrival('FF-0003', R);
  await api.confirmSeating('FF-0001', 1, R);
  await assert.rejects(() => api.confirmSeating('FF-0003', 1, R), {
    code: 'INVALID_STATE',
  });
  assert.equal(orders().commands.length, 1);
});

test('mesa de capacidade diferente da reserva é recusada', async () => {
  const { api } = setup();
  await api.registerArrival('FF-0001', R);
  await assert.rejects(() => api.confirmSeating('FF-0001', 11, R), {
    code: 'INVALID_STATE',
  });
});

test('preserva comandas do módulo de pedidos e recusa mesa já aberta lá', async () => {
  const { api, storage, orders } = setup();
  storage.setItem(
    ORDERS_KEY,
    JSON.stringify({
      tables: [
        { id: 1, number: 1, capacity: 4, status: 'aberta', commandId: 101 },
      ],
      commands: [
        {
          id: 101,
          tableId: 1,
          status: 'aberta',
          rounds: [{ id: 'x' }],
          tasting: null,
        },
      ],
    }),
  );
  await api.registerArrival('FF-0001', R);
  await assert.rejects(() => api.confirmSeating('FF-0001', 1, R), {
    code: 'INVALID_STATE',
  });
  assert.equal(
    (await api.getReservations({ date: TODAY }))[0].status,
    'chegou',
  );

  await api.confirmSeating('FF-0001', 2, R);
  const saved = orders();
  assert.equal(saved.commands.length, 2);
  assert.equal(saved.commands[0].rounds.length, 1);
  assert.equal(saved.commands[1].id, 102);
});

test('consulta do responsável com código inexistente devolve null', async () => {
  const { api } = setup();
  assert.equal(await api.getGuestStatus('FF-9999'), null);
});

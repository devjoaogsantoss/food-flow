import { localDateString, validateDate, validateResponsible, serviceTimes } from '../lib/reservations.js';
import { buildTables } from '../lib/tables.js';
import {
  browserStorage,
  readState,
  writeState,
  withStateLock,
} from './localStore.js';
export { RECEPTION_KEY, ORDERS_KEY } from './localStore.js';
import {
  ALL_SERVICES,
  RECEPTION_ROLE,
  describeGuestStatus,
  filterReservations,
} from '../lib/reception.js';

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Dados demonstrativos preservados. Novas reservas usam o mesmo registro.
function buildReservation(id, guestName, tableCategory, date, service) {
  return {
    id,
    guestName,
    partySize: tableCategory,
    tableCategory,
    date,
    service,
    status: 'reservada',
    arrivedAt: null,
    waitingSince: null,
    waitingTableId: null,
    seatedAt: null,
    tableId: null,
    commandId: null,
  };
}

function nextDay(date) {
  const value = new Date(date + 'T12:00:00');
  value.setDate(value.getDate() + 1);
  return localDateString(value);
}

export function buildSeed(today) {
  return {
    tables: buildTables(),
    waitlist: [],
    barOccupancy: 0,
    reservations: [
      buildReservation('FF-0001', 'Ana Souza', 2, today, '17:45'),
      buildReservation('FF-0002', 'Bruno Lima', 4, today, '17:45'),
      buildReservation('FF-0003', 'Carla Mendes', 2, today, '20:00'),
      buildReservation('FF-0004', 'Diego Rocha', 4, today, '20:00'),
      buildReservation('FF-0005', 'Elisa Prado', 8, today, '20:00'),
      buildReservation('FF-0006', 'Fábio Nunes', 2, today, '22:15'),
      buildReservation('FF-0007', 'Gabriela Alves', 2, nextDay(today), '20:00'),
    ],
  };
}

function assertReception(role) {
  if (role !== RECEPTION_ROLE) {
    throw fail('FORBIDDEN', 'Somente a recepção pode executar esta ação.');
  }
}

function findReservation(data, reservationId) {
  const reservation = data.reservations.find(
    (item) => item.id === reservationId,
  );
  if (!reservation) throw fail('NOT_FOUND', 'Reserva não encontrada.');
  return reservation;
}

function findTable(data, tableId) {
  const table = data.tables.find((item) => item.id === Number(tableId));
  if (!table) throw fail('NOT_FOUND', 'Mesa não encontrada.');
  return table;
}

// Cria a API da recepção. O armazenamento e o relógio podem ser trocados nos
// testes; no navegador usamos localStorage e a hora atual.
export function createReceptionApi({ storage, now = () => new Date() } = {}) {
  const store = () => storage ?? browserStorage();

  function write(data) {
    const state = readState(store());
    state.reception = data;
    writeState(state, store());
  }

  function read() {
    const state = readState(store());
    const data = state.reception ?? buildSeed(localDateString(now()));
    data.waitlist ??= [];
    data.barOccupancy ??= 0;
    for (const table of data.tables) {
      if (
        state.orders.commands.some(
          (command) =>
            command.tableId === table.id && command.status === 'aberta',
        )
      ) {
        table.status = 'ocupada';
      }
    }
    return data;
  }

  function readOrders() {
    return readState(store()).orders;
  }

  // Abre (uma única vez) a comanda no módulo de pedidos, ligada à mesa e à
  // reserva. Devolve a comanda existente se a reserva já tiver uma.
  function openCommand(orders, reservation, table) {
    const existing = orders.commands.find(
      (command) => command.reservationId === reservation.id,
    );
    if (existing) {
      if (existing.status !== 'aberta' || existing.tableId !== table.id) {
        throw fail(
          'CONFLICT',
          'Esta reserva já possui uma comanda incompatível. Solicite revisão.',
        );
      }
      return { command: existing, created: false };
    }

    const tableInOrders = orders.tables.find((item) => item.id === table.id);
    if (
      tableInOrders?.status === 'aberta' ||
      orders.commands.some(
        (command) =>
          command.tableId === table.id && command.status === 'aberta',
      )
    ) {
      throw fail(
        'CONFLICT',
        `A mesa ${table.number} já tem uma comanda aberta no módulo de pedidos.`,
      );
    }

    const lastId = orders.commands.reduce(
      (max, command) => Math.max(max, Number(command.id) || 0),
      100,
    );
    const command = {
      id: lastId + 1,
      tableId: table.id,
      reservationId: reservation.id,
      partySize: reservation.partySize,
      parkingRequired: reservation.parkingRequired ?? null,
      reservationPayment: reservation.payment ? { ...reservation.payment } : null,
      status: 'aberta',
      openedAt: now().toISOString(),
      rounds: [],
      tasting: null,
    };
    orders.commands.push(command);

    if (tableInOrders) {
      tableInOrders.status = 'aberta';
      tableInOrders.commandId = command.id;
    } else {
      orders.tables.push({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        status: 'aberta',
        commandId: command.id,
      });
    }
    return { command, created: true };
  }

  const api = {
    async getReservations(filters = {}) {
      const data = read();
      return filterReservations(data.reservations, {
        service: ALL_SERVICES,
        ...filters,
      });
    },

    async getTables() {
      return read().tables;
    },

    async registerArrival(reservationId, role, parkingRequired) {
      assertReception(role);
      if (parkingRequired !== undefined && typeof parkingRequired !== 'boolean')
        throw fail('INVALID_INPUT', 'Informe se precisa de estacionamento.');
      const data = read();
      const reservation = findReservation(data, reservationId);

      // Repetir o clique devolve a mesma chegada, sem registrar outra.
      if (['cancelada', 'encerrada'].includes(reservation.status))
        throw fail('INVALID_STATE', 'Reserva cancelada ou visita encerrada.');
      if (reservation.status !== 'reservada') {
        return { reservation, changed: false };
      }
      reservation.status = 'chegou';
      reservation.parkingRequired = parkingRequired ?? null;
      reservation.arrivedAt = now().toISOString();
      write(data);
      return { reservation, changed: true };
    },

    async updateParking(reservationId, parkingRequired, role) {
      assertReception(role);
      if (typeof parkingRequired !== 'boolean')
        throw fail('INVALID_INPUT', 'Informe sim ou não para estacionamento.');
      const data = read();
      const reservation = findReservation(data, reservationId);
      if (['encerrada', 'cancelada'].includes(reservation.status))
        throw fail('INVALID_STATE', 'Visita encerrada.');
      reservation.parkingRequired = parkingRequired;
      const state = readState(store());
      state.reception = data;
      const command = state.orders.commands.find(
        (item) => item.id === reservation.commandId,
      );
      if (command && command.status !== 'aberta')
        throw fail('INVALID_STATE', 'Não é possível alterar estacionamento após o fechamento.');
      if (command) command.parkingRequired = parkingRequired;
      writeState(state, store());
      return { changed: true };
    },

    async registerWait(reservationId, tableId, role) {
      assertReception(role);
      const data = read();
      const reservation = findReservation(data, reservationId);
      const table = findTable(data, tableId);

      if (table.capacity !== reservation.tableCategory) {
        throw fail(
          'INVALID_STATE',
          'Selecione uma mesa da categoria reservada.',
        );
      }

      if (reservation.status === 'reservada') {
        throw fail('INVALID_STATE', 'Registre a chegada antes da espera.');
      }
      if (reservation.status === 'acomodada') {
        throw fail('INVALID_STATE', 'Esta reserva já foi acomodada.');
      }
      if (!['chegou', 'em_espera'].includes(reservation.status)) {
        throw fail(
          'INVALID_STATE',
          'A reserva não está aguardando acomodação.',
        );
      }
      if (table.status === 'pronta') {
        throw fail(
          'INVALID_STATE',
          'A mesa já está pronta. Confirme a acomodação.',
        );
      }
      if (
        reservation.status === 'em_espera' &&
        reservation.waitingTableId === table.id
      ) {
        return { reservation, changed: false };
      }
      reservation.status = 'em_espera';
      reservation.waitingSince ??= now().toISOString();
      reservation.waitingTableId = table.id;
      write(data);
      return { reservation, changed: true };
    },

    async markTableReady(tableId, role) {
      assertReception(role);
      const data = read();
      const table = findTable(data, tableId);
      if (table.status === 'pronta') return { table, changed: false };
      if (table.status !== 'aguardando_limpeza') {
        throw fail('INVALID_STATE', 'A mesa ainda está ocupada.');
      }
      if (
        readOrders().commands.some(
          (command) =>
            command.tableId === table.id && command.status === 'aberta',
        )
      ) {
        throw fail('CONFLICT', 'A mesa ainda tem uma comanda aberta.');
      }
      table.status = 'pronta';
      write(data);
      return { table, changed: true };
    },

    async confirmSeating(reservationId, tableId, role) {
      assertReception(role);
      const data = read();
      const reservation = findReservation(data, reservationId);

      // Repetir o clique devolve a comanda que já foi aberta.
      if (reservation.status === 'acomodada') {
        const orders = readOrders();
        const command = orders.commands.find(
          (item) => item.id === reservation.commandId,
        );
        return { reservation, command, changed: false };
      }
      if (reservation.status === 'reservada') {
        throw fail('INVALID_STATE', 'Registre a chegada antes de acomodar.');
      }
      if (!['chegou', 'em_espera'].includes(reservation.status)) {
        throw fail(
          'INVALID_STATE',
          'A reserva não está aguardando acomodação.',
        );
      }

      const table = findTable(data, tableId);
      if (table.capacity !== reservation.tableCategory) {
        throw fail(
          'INVALID_STATE',
          `Esta reserva é para mesa de ${reservation.tableCategory} lugares.`,
        );
      }
      if (table.status !== 'pronta') {
        throw fail('INVALID_STATE', 'A mesa ainda não está pronta.');
      }

      // Só aqui a comanda nasce. Um único registro persiste os dois módulos.
      const orders = readOrders();
      const { command } = openCommand(orders, reservation, table);

      table.status = 'ocupada';
      reservation.status = 'acomodada';
      reservation.seatedAt = now().toISOString();
      reservation.tableId = table.id;
      reservation.commandId = command.id;
      reservation.waitingTableId = null;
      const state = readState(store());
      state.reception = data;
      state.orders = orders;
      writeState(state, store());
      return { reservation, command, changed: true };
    },

    async getOperations() {
      const data = read();
      return { waitlist: data.waitlist, barOccupancy: data.barOccupancy };
    },

    async setBarOccupancy(value, role) {
      assertReception(role);
      const count = Number(value);
      if (!Number.isInteger(count) || count < 0 || count > 20) {
        throw fail('INVALID_INPUT', 'O bar comporta de 0 a 20 pessoas.');
      }
      const data = read();
      data.barOccupancy = count;
      write(data);
      return { changed: true };
    },

    async addWaitlistEntry(entry, role) {
      assertReception(role);
      const guestName = String(entry.guestName ?? '').trim();
      const whatsapp = String(entry.whatsapp ?? '').trim();
      const email = String(entry.email ?? '').trim();
      const tableCategory = Number(entry.tableCategory);
      if (
        validateResponsible({ guestName, whatsapp, email }) ||
        ![2, 4, 8].includes(tableCategory) ||
        validateDate(entry.date, localDateString(now())) ||
        !serviceTimes.includes(entry.service)
      ) {
        throw fail(
          'INVALID_INPUT',
          'Informe nome, categoria, data, serviço, WhatsApp e e-mail válidos.',
        );
      }
      const data = read();
      if (
        data.waitlist.some(
          (item) =>
            item.date === entry.date &&
            item.service === entry.service &&
            item.whatsapp.replace(/\D/g, '') === whatsapp.replace(/\D/g, '') &&
            ['aguardando', 'contatado'].includes(item.status),
        )
      ) {
        throw fail(
          'CONFLICT',
          'Este contato já está aguardando neste serviço.',
        );
      }
      const item = {
        id: crypto.randomUUID(),
        guestName,
        whatsapp,
        email,
        tableCategory,
        date: entry.date,
        service: entry.service,
        status: 'aguardando',
        createdAt: now().toISOString(),
      };
      data.waitlist.push(item);
      write(data);
      return { entry: item, changed: true };
    },

    async updateWaitlistEntry(id, status, role) {
      assertReception(role);
      if (!['aguardando', 'contatado', 'cancelado'].includes(status)) {
        throw fail('INVALID_INPUT', 'Situação da lista de espera inválida.');
      }
      const data = read();
      const entry = data.waitlist.find((item) => item.id === id);
      if (!entry) throw fail('NOT_FOUND', 'Inscrição não encontrada.');
      entry.status = status;
      write(data);
      return { entry, changed: true };
    },

    async registerDeparture(reservationId, role) {
      assertReception(role);
      const data = read();
      const reservation = findReservation(data, reservationId);
      if (reservation.status === 'encerrada')
        return { reservation, changed: false };
      if (reservation.status !== 'acomodada')
        throw fail('INVALID_STATE', 'O grupo ainda não foi acomodado.');
      const orders = readOrders();
      const command = orders.commands.find(
        (item) => item.id === reservation.commandId,
      );
      if (!command || command.status !== 'fechada') {
        throw fail(
          'INVALID_STATE',
          'A conta precisa ser encerrada pelo módulo de fechamento antes da saída.',
        );
      }
      if (command.rounds.some((round) => round.status !== 'entregue')) {
        throw fail('INVALID_STATE', 'Ainda existem rodadas não entregues.');
      }
      if (
        orders.commands.some(
          (item) =>
            item.tableId === reservation.tableId && item.status === 'aberta',
        )
      ) {
        throw fail('CONFLICT', 'A mesa ainda tem comanda aberta.');
      }
      const table = findTable(data, reservation.tableId);
      table.status = 'aguardando_limpeza';
      const orderTable = orders.tables.find((item) => item.id === table.id);
      if (orderTable) {
        orderTable.status = 'livre';
        orderTable.commandId = null;
      }
      reservation.status = 'encerrada';
      reservation.departedAt = now().toISOString();
      const state = readState(store());
      state.reception = data;
      state.orders = orders;
      writeState(state, store());
      return { reservation, changed: true };
    },

    // Consulta demonstrativa por código; autorização real depende da API.
    async getGuestStatus(reservationId) {
      const code = String(reservationId ?? '')
        .trim()
        .toUpperCase();
      const data = read();
      const reservation = data.reservations.find((item) => item.id === code);
      if (!reservation) return null;
      const table = reservation.tableId
        ? data.tables.find((item) => item.id === reservation.tableId)
        : null;
      return {
        id: reservation.id,
        guestName: reservation.guestName,
        date: reservation.date,
        service: reservation.service,
        status: reservation.status,
        tableCategory: reservation.tableCategory,
        partySize: reservation.partySize,
        commandId: reservation.commandId,
        table: table ? { number: table.number } : null,
        ...describeGuestStatus(reservation, table),
        ...(reservation.status === 'acomodada' && readOrders().commands.some(
          (command) => command.id === reservation.commandId && command.status === 'fechada',
        ) ? { title: 'Comanda fechada', message: 'Consulte o resumo da comanda e procure a recepção para registrar a saída.' } : {}),
        canViewCommand: Boolean(reservation.commandId && readOrders().commands.some(
          (command) => command.id === reservation.commandId && command.reservationId === reservation.id,
        )),
        canOrder:
          reservation.status === 'acomodada' &&
          readOrders().commands.some(
            (command) =>
              command.id === reservation.commandId &&
              command.status === 'aberta',
          ),
      };
    },
  };
  const mutations = new Set([
    'registerArrival',
    'updateParking',
    'registerWait',
    'markTableReady',
    'confirmSeating',
    'setBarOccupancy',
    'registerDeparture',
    'addWaitlistEntry',
    'updateWaitlistEntry',
  ]);
  return Object.fromEntries(
    Object.entries(api).map(([name, action]) => [
      name,
      mutations.has(name)
        ? (...args) => withStateLock(store(), () => action(...args))
        : action,
    ]),
  );
}

export const receptionApi = createReceptionApi();

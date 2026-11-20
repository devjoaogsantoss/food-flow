import { buildTables } from '../lib/tables.js';

export const STATE_KEY = 'food-flow-state-v1';
export const RECEPTION_KEY = 'food-flow-reception';
export const ORDERS_KEY = 'food-flow-orders';
export const STATE_EVENT = 'food-flow-state-changed';

export function storageError(message) {
  return Object.assign(new Error(message), { code: 'STORAGE_ERROR' });
}

export function browserStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw storageError('Armazenamento do navegador indisponível.');
  }
  return window.localStorage;
}

function parse(store, key) {
  const raw = store.getItem(key);
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    throw storageError(
      `Não foi possível ler ${key}. Os dados foram preservados; solicite revisão.`,
    );
  }
}

function validate(state) {
  if (
    state.version !== 1 ||
    !Array.isArray(state.orders?.tables) ||
    !Array.isArray(state.orders?.commands) ||
    (state.reception !== null &&
      (!Array.isArray(state.reception?.tables) ||
        !Array.isArray(state.reception?.reservations)))
  ) {
    throw storageError(
      'Formato de armazenamento incompatível. Os dados foram preservados.',
    );
  }
  return state;
}

// Importa uma vez, sem remover nem regravar as duas chaves antigas.
export function readState(store = browserStorage()) {
  const current = parse(store, STATE_KEY);
  if (current) return validate(current);
  const oldOrders = parse(store, ORDERS_KEY);
  const reception = parse(store, RECEPTION_KEY);
  const orders = oldOrders ?? { tables: [], commands: [] };
  if (
    !Array.isArray(orders.tables) ||
    !Array.isArray(orders.commands) ||
    (reception &&
      (!Array.isArray(reception.tables) ||
        !Array.isArray(reception.reservations)))
  ) {
    throw storageError(
      'Dados antigos incompatíveis. A migração não alterou os registros.',
    );
  }
  // Corrige o inventário, preservando a capacidade antiga e todos os pedidos.
  const canonical = buildTables();
  orders.tables = canonical
    .map((table) => {
      const old = orders.tables.find((item) => item.id === table.id);
      return {
        ...old,
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        ...(old && old.capacity !== table.capacity
          ? { legacyCapacity: old.capacity }
          : {}),
        status: old?.status ?? 'livre',
        commandId: old?.commandId ?? null,
      };
    })
    .concat(
      orders.tables.filter(
        (table) => !canonical.some((item) => item.id === table.id),
      ),
    );
  if (reception) {
    reception.tables = canonical
      .map((table) => ({
        ...table,
        ...reception.tables.find((item) => item.id === table.id),
        capacity: table.capacity,
      }))
      .concat(
        reception.tables.filter(
          (table) => !canonical.some((item) => item.id === table.id),
        ),
      );
    for (const table of reception.tables) {
      if (
        orders.commands.some(
          (command) =>
            command.tableId === table.id && command.status === 'aberta',
        )
      ) {
        table.status = 'ocupada';
      }
    }
  }
  return validate({ version: 1, orders, reception });
}

// Comanda e acomodação são persistidas por um único setItem.
export function writeState(state, store = browserStorage()) {
  validate(state);
  store.setItem(STATE_KEY, JSON.stringify(state));
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(STATE_EVENT));
}

export function subscribeState(listener) {
  const onStorage = (event) => {
    if (event.key === STATE_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(STATE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(STATE_EVENT, listener);
  };
}

const queues = new WeakMap();
export function withStateLock(store, action) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('food-flow-state', action);
  }
  // Alternativa serializa apenas este contexto JS, não outras abas.
  const previous = queues.get(store) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action);
  queues.set(store, next);
  return next;
}

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildTables } from '../src/lib/tables.js';
import { STATE_KEY } from '../src/services/localStore.js';

// Uma fila por arquivo também coordena conexões no mesmo processo. O SQLite
// protege processos distintos por BEGIN IMMEDIATE e busy_timeout.
const queues = new Map();
export function openDatabase(filename) {
  const key = filename === ':memory:' ? Symbol() : resolve(filename);
  if (filename !== ':memory:') mkdirSync(dirname(key), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL CHECK(json_valid(value)));
    CREATE TABLE IF NOT EXISTS tables(id INTEGER PRIMARY KEY, capacity INTEGER NOT NULL CHECK(capacity IN (2,4,8)), status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY, date TEXT NOT NULL, service TEXT NOT NULL, category INTEGER NOT NULL CHECK(category IN (2,4,8)), slot INTEGER, status TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(date,service,category,slot));
    CREATE TRIGGER IF NOT EXISTS reservation_capacity BEFORE INSERT ON reservations WHEN NEW.slot IS NOT NULL
      BEGIN SELECT CASE WHEN NEW.slot < 1 OR NEW.slot > (SELECT count(*) FROM tables WHERE capacity=NEW.category)
        THEN RAISE(ABORT,'reservation capacity exceeded') END; END;
    CREATE TABLE IF NOT EXISTS commands(id INTEGER PRIMARY KEY, reservation_id TEXT NOT NULL UNIQUE REFERENCES reservations(id), table_id INTEGER NOT NULL REFERENCES tables(id), status TEXT NOT NULL, data TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS one_open_check_per_table ON commands(table_id) WHERE status='aberta';
    CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY, command_id INTEGER NOT NULL REFERENCES commands(id), sequence INTEGER NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(command_id,sequence));
    CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, round_id TEXT NOT NULL REFERENCES rounds(id), price_cents INTEGER NOT NULL CHECK(price_cents>=0), quantity INTEGER NOT NULL CHECK(quantity>0), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reservation_payments(reservation_id TEXT PRIMARY KEY REFERENCES reservations(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS waitlist(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, command_id INTEGER NOT NULL REFERENCES commands(id), type TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_call ON calls(command_id,type) WHERE status='pendente';
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('recepcao','garcom','cozinha')));
    CREATE TABLE IF NOT EXISTS guest_credentials(reservation_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, principal TEXT NOT NULL, role TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS idempotency(scope TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(scope,key));
    CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);
    -- Infraestrutura para Israel: uma aplicação de crédito e uma liquidação por comanda.
    CREATE TABLE IF NOT EXISTS check_credits(command_id INTEGER PRIMARY KEY REFERENCES commands(id) DEFERRABLE INITIALLY DEFERRED, reservation_id TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL CHECK(amount_cents>=0));
    CREATE TABLE IF NOT EXISTS settlements(command_id INTEGER PRIMARY KEY REFERENCES commands(id) DEFERRABLE INITIALLY DEFERRED, reference TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), channel TEXT NOT NULL, created_at TEXT NOT NULL);
    INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));
  `);
  function project(state) {
    db.exec('DELETE FROM calls; DELETE FROM items; DELETE FROM rounds; DELETE FROM commands; DELETE FROM reservation_payments; DELETE FROM reservations; DELETE FROM waitlist; DELETE FROM tables;');
    const insert = (table, values) => db.prepare(`INSERT INTO ${table} VALUES(${values.map(() => '?').join(',')})`).run(...values);
    for (const table of state.reception.tables) insert('tables', [table.id, table.capacity, table.status]);
    const slots = new Map();
    for (const reservation of state.reception.reservations) {
      const group = `${reservation.date}/${reservation.service}/${reservation.tableCategory}`;
      const slot = reservation.status === 'cancelada' ? null : (slots.get(group) ?? 0) + 1;
      if (slot !== null) slots.set(group, slot);
      insert('reservations', [reservation.id, reservation.date, reservation.service, reservation.tableCategory, slot, reservation.status, JSON.stringify(reservation)]);
      if (reservation.payment) insert('reservation_payments', [reservation.id, reservation.payment.amountCents, JSON.stringify(reservation.payment)]);
    }
    for (const command of state.orders.commands) {
      insert('commands', [command.id, command.reservationId, command.tableId, command.status, JSON.stringify(command)]);
      for (const round of command.rounds) {
        insert('rounds', [round.id, command.id, round.number, round.status, JSON.stringify(round)]);
        for (const item of round.items) insert('items', [item.id, round.id, item.priceCents, item.quantity, JSON.stringify(item)]);
      }
      for (const call of command.calls ?? []) insert('calls', [call.id, command.id, call.type ?? 'atendimento', call.status, JSON.stringify(call)]);
    }
    for (const entry of state.reception.waitlist) insert('waitlist', [entry.id, JSON.stringify(entry)]);
  }
  // O snapshot versionado mantém compatibilidade com as regras existentes;
  // projeções relacionais são atualizadas na mesma transação e impõem restrições.
  const storage = {
    getItem(name) { return name === STATE_KEY ? db.prepare('SELECT value FROM app_state WHERE id=1').get()?.value ?? null : null; },
    setItem(name, value) {
      if (name !== STATE_KEY || !db.isTransaction) throw new Error('Gravação exige transação do servidor.');
      project(JSON.parse(value));
      db.prepare('INSERT INTO app_state VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(value);
    },
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!storage.getItem(STATE_KEY)) {
      const tables = buildTables().map(t => ({ ...t, status: 'pronta' }));
      storage.setItem(STATE_KEY, JSON.stringify({ version: 1, reception: { tables, reservations: [], waitlist: [], barOccupancy: 0 }, orders: { tables: tables.map(t => ({ ...t, status: 'livre', commandId: null })), commands: [] } }));
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  function transaction(action) {
    const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      db.exec('BEGIN IMMEDIATE');
      try { const result = await action(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    });
    queues.set(key, next);
    return next;
  }
  return { db, storage, transaction, close: () => db.close() };
}

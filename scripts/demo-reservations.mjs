// Cenário local solicitado: não faz check-in, acomodação ou entrega pelo usuário.
// Reservas/pedidos passam pela API autenticada; estado e tokens ficam em data/.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tastingMenus } from '../src/lib/menu.js';

export const DEMO_DATE = '2026-11-27';
export const DEMO_SERVICE = '17:45';
const item = (productId, quantity) => ({ productId, quantity });
const tasting = (menuId, people, servingTime) => ({
  kind: 'degustacao', menuId, people, servingTime,
  beverageCode: tastingMenus.find(menu => menu.id === menuId).items.find(entry => entry.category === 'Bebida' && entry.available).id,
});
const staffSessions = new Map();
export const demoPlans = [
  { key: 'ana', name: 'TESTE 27/11 · Ana Lima', category: 2, people: 2, label: 'À la carte', items: [item('ENT001', 1), item('PRI001', 2), item('BEB001', 2)] },
  { key: 'bruno', name: 'TESTE 27/11 · Bruno Costa', category: 2, people: 2, label: 'Degustação vegana', items: [tasting('DEG003', 2, 'entrada')] },
  { key: 'carla', name: 'TESTE 27/11 · Carla Souza', category: 4, people: 4, label: 'Pratos principais e bebidas', items: [item('PRI002', 4), item('BEB002', 4)] },
  { key: 'diego', name: 'TESTE 27/11 · Diego Alves', category: 4, people: 4, label: 'Dois menus degustação', items: [tasting('DEG001', 2, 'principal'), tasting('DEG002', 2, 'casa')] },
  { key: 'elisa', name: 'TESTE 27/11 · Elisa Santos', category: 8, people: 8, label: 'Grupo de oito', items: [item('ENT002', 4), item('PRI001', 8), item('BEB006', 8)] },
  { key: 'fabio', name: 'TESTE 27/11 · Fábio Rocha', category: 2, people: 2, label: 'Entrada, principal e sobremesa', items: [item('ENT003', 1), item('PRI003', 2), item('SOB001', 2), item('BEB003', 2)] },
];

async function request(baseUrl, method, path, { body, token, key } = {}) {
  const response = await fetch(baseUrl + '/api' + path, {
    method, signal: AbortSignal.timeout(10_000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(`${method} ${path}: ${result.message}`), { status: response.status, code: result.code });
  return result;
}

async function save(stateFile, state) {
  await mkdir(dirname(stateFile), { recursive: true });
  const temporary = stateFile + '.tmp';
  await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(temporary, stateFile);
}

async function readStateFile(stateFile) {
  try { return JSON.parse(await readFile(stateFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function staffSession(baseUrl, accessFile) {
  const sessionKey = `${baseUrl}:${accessFile}`;
  const cached = staffSessions.get(sessionKey);
  if (cached?.expires > Date.now() + 60_000) return cached;
  const line = (await readFile(accessFile, 'utf8')).split('\n').find(value => value.startsWith('recepcao |'));
  const match = /matrícula: (\S+) \| senha: (\S+)/.exec(line ?? '');
  if (!match) throw new Error('Credenciais locais da recepção não encontradas. Execute db:setup primeiro.');
  const session = await request(baseUrl, 'POST', '/auth/staff', { body: { registration: match[1], password: match[2] } });
  staffSessions.set(sessionKey, session);
  return session;
}

export async function prepareDemo({ baseUrl, accessFile, stateFile }) {
  let state = await readStateFile(stateFile);
  if (state && (state.baseUrl !== baseUrl || state.date !== DEMO_DATE)) throw new Error('O arquivo de cenário pertence a outro ambiente. Use um arquivo separado.');
  state ??= { version: 1, date: DEMO_DATE, service: DEMO_SERVICE, baseUrl, entries: [] };
  const session = await staffSession(baseUrl, accessFile);
  const reservations = await request(baseUrl, 'GET', `/reservations?date=${DEMO_DATE}&service=${encodeURIComponent(DEMO_SERVICE)}`, { token: session.token });
  for (const [index, plan] of demoPlans.entries()) {
    if (state.entries.some(entry => entry.key === plan.key)) continue;
    const email = `demo27.${plan.key}@example.test`;
    const existing = reservations.find(reservation => reservation.email === email && reservation.guestName === plan.name);
    let reservation;
    if (existing) {
      const guest = await request(baseUrl, 'POST', '/auth/guest', { body: { code: existing.id } });
      reservation = { ...existing, session: guest };
    } else {
      reservation = await request(baseUrl, 'POST', '/reservations', {
        key: `demo-27112026-${plan.key}-reservation-v1`,
        body: { date: DEMO_DATE, service: DEMO_SERVICE, tableCategory: plan.category, partySize: plan.people,
          guestName: plan.name, whatsapp: `1190000000${index + 1}`, email, paymentStatus: 'aprovado' },
      });
    }
    state.entries.push({ key: plan.key, name: plan.name, reservationId: reservation.id, token: reservation.session.token,
      category: plan.category, people: plan.people, label: plan.label, items: plan.items, roundId: null });
    await save(stateFile, state);
  }
  return state;
}

export async function dispatchDemo({ baseUrl, accessFile, stateFile, state, log = console.log }) {
  const session = await staffSession(baseUrl, accessFile);
  const reservations = await request(baseUrl, 'GET', `/reservations?date=${DEMO_DATE}&service=${encodeURIComponent(DEMO_SERVICE)}`, { token: session.token });
  for (const entry of state.entries) {
    if (entry.roundId || entry.skipped) continue;
    const reservation = reservations.find(value => value.id === entry.reservationId);
    if (!reservation) throw new Error(`Reserva do cenário não encontrada: ${entry.name}`);
    if (['cancelada', 'encerrada'].includes(reservation.status)) {
      entry.skipped = reservation.status;
      await save(stateFile, state);
      log(`${entry.name}: cenário ignorado (${reservation.status}).`);
      continue;
    }
    if (reservation.status !== 'acomodada' || !reservation.commandId) continue;
    const guest = await request(baseUrl, 'POST', '/auth/guest', { body: { code: entry.reservationId } });
    entry.token = guest.token;
    const round = await request(baseUrl, 'POST', '/orders', { token: entry.token,
      key: `demo-27112026-${entry.key}-order-v1`,
      body: { commandId: reservation.commandId, items: entry.items, notes: 'Pedido fictício automático para testar salão e cozinha.' },
    });
    entry.roundId = round.id;
    entry.commandId = reservation.commandId;
    entry.sentAt = new Date().toISOString();
    await save(stateFile, state);
    log(`${entry.name}: rodada ${round.number} enviada para mesa ${reservation.tableId}, comanda #${reservation.commandId}.`);
  }
  return state.entries.every(entry => entry.roundId || entry.skipped);
}

async function main() {
  const mode = process.argv[2] ?? 'prepare';
  if (!['prepare', 'watch'].includes(mode)) throw new Error('Use prepare ou watch.');
  const options = { baseUrl: process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3001',
    accessFile: resolve(process.env.DEMO_ACCESS_FILE ?? 'data/initial-access.txt'),
    stateFile: resolve(process.env.DEMO_STATE_FILE ?? 'data/demo-2026-11-27.json') };
  if (mode === 'prepare') {
    const state = await prepareDemo(options);
    console.log(JSON.stringify({ date: state.date, service: state.service, reservations: state.entries.map(({ name, reservationId, people, label }) => ({ name, reservationId, people, label })) }, null, 2));
    return;
  }
  const state = await readStateFile(options.stateFile);
  if (!state || state.baseUrl !== options.baseUrl || state.date !== DEMO_DATE) throw new Error('Prepare o cenário deste ambiente antes de iniciar o monitor.');
  console.log('Monitor ativo: pedidos entram somente após acomodação manual na recepção.');
  let stopped = false;
  process.on('SIGINT', () => { stopped = true; });
  process.on('SIGTERM', () => { stopped = true; });
  while (!stopped && new Date() < new Date('2026-11-28T03:00:00Z')) {
    try {
      if (await dispatchDemo({ ...options, state })) { console.log('Cenário concluído. Monitor encerrado.'); return; }
    } catch (error) {
      console.error(`Monitor: ${error.message}`);
      if ([400, 403, 404, 409, 422].includes(error.status)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  console.log('Monitor encerrado sem alterar chegadas, acomodações ou entregas.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

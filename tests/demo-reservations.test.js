import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { prepareDemo, dispatchDemo, demoPlans, DEMO_DATE, DEMO_SERVICE } from '../scripts/demo-reservations.mjs';

test('cenário prepara seis reservas sem duplicar e só envia pedido após acomodação', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'food-flow-demo-seed-'));
  const accessFile = join(directory, 'access.txt'), stateFile = join(directory, 'scenario.json');
  const password = 'Demo-test-reception-password';
  const instance = createApp({ filename: ':memory:', serveStatic: false, now: () => new Date('2026-11-25T12:00:00-03:00') });
  instance.db.prepare('INSERT INTO users VALUES(?,?,?)').run('15152018', hashPassword(password), 'recepcao');
  instance.db.prepare('INSERT INTO users VALUES(?,?,?)').run('01510041', hashPassword(password), 'garcom');
  await writeFile(accessFile, `recepcao | matrícula: 15152018 | senha: ${password}\n`, { mode: 0o600 });
  const server = instance.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); instance.close(); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const options = { baseUrl, accessFile, stateFile };
  let state = await prepareDemo(options);
  state = await prepareDemo(options);
  assert.equal(instance.db.prepare('SELECT count(*) n FROM reservations').get().n, 6);
  assert.equal(instance.db.prepare('SELECT count(*) n FROM commands').get().n, 0);
  assert.equal(state.entries.length, 6);
  assert.equal(await dispatchDemo({ ...options, state, log: () => {} }), false);
  const login = await fetch(baseUrl + '/api/auth/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registration: '15152018', password }), signal: AbortSignal.timeout(10_000) });
  const { token } = await login.json();
  const waiterLogin = await fetch(baseUrl + '/api/auth/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registration: '01510041', password }), signal: AbortSignal.timeout(10_000) });
  const waiter = (await waiterLogin.json()).token;
  const mutate = async (path, body, session = token) => {
    const response = await fetch(baseUrl + '/api' + path, { method: 'POST', headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200); return response.json();
  };
  await mutate(`/reservations/${state.entries[0].reservationId}/check-in`, { parkingRequired: false });
  await dispatchDemo({ ...options, state, log: () => {} });
  assert.equal(instance.db.prepare('SELECT count(*) n FROM rounds').get().n, 0, 'check-in não autoriza pedido antes da mesa');
  const tableIds = [1, 2, 11, 12, 17, 3];
  for (const [index, entry] of state.entries.entries()) {
    if (index !== 0) await mutate(`/reservations/${entry.reservationId}/check-in`, { parkingRequired: false });
    await mutate(`/reservations/${entry.reservationId}/table`, { tableId: tableIds[index] });
    await dispatchDemo({ ...options, state, log: () => {} });
    assert.equal(state.entries[index].roundId,null,'mesa definida ainda aguarda confirmação do salão');
    await mutate(`/floor/accommodations/${entry.reservationId}`, {}, waiter);
  }
  assert.equal(await dispatchDemo({ ...options, state, log: () => {} }), true);
  assert.equal(instance.db.prepare('SELECT count(*) n FROM rounds').get().n, 6);
  // Simula uma repetição após perda da confirmação local: a API recupera a rodada.
  for (const entry of state.entries) entry.roundId = null;
  assert.equal(await dispatchDemo({ ...options, state, log: () => {} }), true);
  assert.equal(instance.db.prepare('SELECT count(*) n FROM rounds').get().n, 6);
  assert.equal(instance.db.prepare("SELECT count(*) n FROM reservations WHERE date=? AND service=? AND status='acomodada'").get(DEMO_DATE, DEMO_SERVICE).n, demoPlans.length);
});

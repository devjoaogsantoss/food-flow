import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { localDateString } from '../src/lib/reservations.js';

async function startProduction(filename) {
  const child = spawn(process.execPath, [resolve('server/production.js')], {
    cwd: dirname(filename), env: { ...process.env, FOOD_FLOW_DB: filename, HOST: '127.0.0.1', PORT: '0', FOOD_FLOW_TRUST_PROXY: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '', errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const base = await new Promise((resolveBase, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Produção não iniciou em 10 segundos.')); }, 10_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Produção encerrou antes de iniciar: ${code}. ${errors}`)); });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = /Food Flow: (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolveBase(match[1]); }
    });
  });
  return { base, get output() { return output; }, async stop() {
    if (child.exitCode !== null) return;
    const exited = once(child, 'exit'); child.kill(); await exited;
  } };
}

async function productionFolder() {
  const folder = await mkdtemp(join(tmpdir(), 'food-flow-production-'));
  await mkdir(join(folder, 'dist'));
  await writeFile(join(folder, 'dist', 'index.html'), '<!doctype html><div id="root"></div>');
  return folder;
}

test('entrada de produção exige caminho absoluto e configuração válida antes de iniciar', async () => {
  const folder = await productionFolder();
  for (const env of [
    { FOOD_FLOW_DB: 'data/relative.sqlite' },
    { FOOD_FLOW_DB: resolve('work/not-created.sqlite'), PORT: 'not-a-port' },
    { FOOD_FLOW_DB: resolve('work/not-created.sqlite'), PORT: '3001', FOOD_FLOW_TRUST_PROXY: 'all' },
  ]) {
    const result = spawnSync(process.execPath, [resolve('server/production.js')], {
      cwd: folder, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /FOOD_FLOW_DB|PORT|FOOD_FLOW_TRUST_PROXY/);
  }
});

test('produção serve assets e API, inicializa contas uma vez e preserva reserva após reiniciar', async t => {
  const folder = await productionFolder();
  const filename = join(folder, 'food-flow.sqlite');
  let processInstance = await startProduction(filename);
  t.after(() => processInstance.stop());
  const request = (path, options = {}) => fetch(processInstance.base + path, { ...options, signal: AbortSignal.timeout(10_000) });
  assert.equal((await request('/api/health')).status, 200);
  const page = await request('/minha-reserva');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /id="root"/);
  const access = await readFile(join(folder, 'initial-access.txt'), 'utf8');
  assert.equal(access.trim().split('\n').length, 3);
  for (const role of ['recepcao', 'garcom', 'cozinha']) assert.match(access, new RegExp(role));
  const password = /senha: (\S+)/.exec(access)[1];
  assert.equal(processInstance.output.includes(password), false, 'senha não deve aparecer no log');
  const hashBefore = createHash('sha256').update(access).digest('hex');
  const date = new Date(); date.setDate(date.getDate() + 7);
  while ([0, 1].includes(date.getUTCDay())) date.setDate(date.getDate() + 1);
  const result = await request('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    date: localDateString(date), service: '20:00', tableCategory: 2, partySize: 2,
    guestName: 'Cliente produção', whatsapp: '81999998888', email: 'production@example.test',
    password: 'Production-test-only-password', paymentStatus: 'aprovado',
  }) });
  assert.equal(result.status, 200);
  const reservation = await result.json();
  await processInstance.stop();
  processInstance = await startProduction(filename);
  const after = await readFile(join(folder, 'initial-access.txt'), 'utf8');
  assert.equal(createHash('sha256').update(after).digest('hex'), hashBefore);
  const restored = await request(`/api/reservations/${reservation.id}`, { headers: { Authorization: `Bearer ${reservation.session.token}` } });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).id, reservation.id);
});

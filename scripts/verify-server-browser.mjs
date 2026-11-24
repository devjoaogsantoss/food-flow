// Verificação local em perfil temporário: nunca usa os dados do navegador pessoal.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';

const chrome =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'food-flow-browser-'));
const PASSWORD = 'Browser-test-password-2026';
const api = createApp({ filename: join(profile, 'browser.sqlite'), serveStatic: false });
for (const [id,role] of [['15152018','recepcao'],['01510041','garcom'],['00589510','cozinha']])
  api.db.prepare('INSERT INTO users VALUES(?,?,?)').run(id, hashPassword(PASSWORD), role);
const apiServer = api.app.listen(0,'127.0.0.1');
await once(apiServer,'listening');
const server = await createServer({ server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: 'http://127.0.0.1:' + apiServer.address().port } } } });
let browser;
let browserConnection;
const connections = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(action, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const value = await action();
      if (value) return value;
    } catch {
      /* aguarda readiness */
    }
    await delay(100);
  }
  throw new Error('Tempo excedido: ' + label);
}
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('CDP timeout: ' + method));
      }, 10000);
      pending.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });
  const errors = [];
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails);
  });
  const connection = { call, errors, close: () => ws.close() };
  connections.push(connection);
  return connection;
}

try {
  await server.listen();
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      '--user-data-dir=' + profile,
      'about:blank',
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  browser.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  browser.on('error', (error) => {
    stderr += error.message;
  });
  const endpoint = await until(
    () => stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1],
    'Chrome',
  );
  browserConnection = await connect(endpoint);
  const cdpOrigin = 'http://' + new URL(endpoint).host;
  async function tab(path) {
    const { browserContextId } = await browserConnection.call('Target.createBrowserContext');
    const { targetId } = await browserConnection.call('Target.createTarget', {
      url: base + path, browserContextId,
    });
    const target = await until(
      async () =>
        (await (await fetch(cdpOrigin + '/json/list')).json()).find(
          (item) => item.id === targetId,
        ),
      'aba',
    );
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.call('Runtime.enable');
    return connection;
  }
  async function evaluate(tab, expression) {
    const result = await tab.call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const text = async (tab, expected) => {
    try {
      return await until(
        () =>
          evaluate(
            tab,
            `document.body.innerText.includes(${JSON.stringify(expected)})`,
          ),
        expected,
      );
    } catch (error) {
      throw new Error(
        error.message +
          ' | ' +
          JSON.stringify({
            errors: tab.errors,
            body: await evaluate(tab, 'document.body.innerText.slice(0, 600)'),
          }),
      );
    }
  };
  const click = (tab, selector) =>
    evaluate(
      tab,
      `document.querySelector(${JSON.stringify(selector)}).click()`,
    );
  async function fill(tab, selector, value) {
    await evaluate(
      tab,
      `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    })()`,
    );
  }
  async function login(tab, registration) {
    await text(tab, 'Acesso por matrícula');
    await fill(tab, '#staff-registration', registration);
    await fill(tab, '#staff-password', PASSWORD);
    await click(tab, '.staff-login button');
  }
  const home = await tab('/');
  await text(home, 'Planeje seu próximo encontro.');
  const date = await evaluate(home, `(() => { const d=new Date();d.setDate(d.getDate()+7);while([0,1].includes(d.getDay()))d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');})()`);
  await fill(home,'#visit-date',date);
  await click(home,'.reservas form button');
  await text(home,'Nome completo');
  await fill(home,'[name="guestName"]','Cliente API Browser');
  await fill(home,'[name="whatsapp"]','11999998888');
  await fill(home,'[name="email"]','api-browser@example.test');
  await fill(home,'[name="password"]',PASSWORD);
  await click(home,'.reservas form button:not([type="button"])');
  await text(home,'Simular aprovação');
  await evaluate(home,`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Simular aprovação').click()`);
  await text(home,'Código:');
  const code=await evaluate(home,`document.querySelector('.reservas-code strong').textContent`);
  const reception=await tab('/recepcao');
  await login(reception,'15152018');
  await until(()=>evaluate(reception,`Boolean(document.querySelector('#rc-date'))`),'filtro de data');
  await fill(reception,'#rc-date',date);
  await text(reception,'Cliente API Browser');
  await fill(reception,'#parking-'+code,'nao');
  await click(reception,'.rc-card .rc-btn');
  await text(reception,'Selecione a mesa');
  await fill(reception,'#table-'+code,'1');
  await until(()=>evaluate(reception,`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Confirmar acomodação')`),'acomodação');
  await evaluate(reception,`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Confirmar acomodação').click()`);
  const waiter=await tab('/pedidos');
  await login(waiter,'01510041');
  await text(waiter,'Comanda #101');
  await click(waiter,'.table-card');
  await text(waiter,'Anotar pedido da mesa');
  await click(waiter,'.menu-path:first-child');
  await until(()=>evaluate(waiter,`Boolean(document.querySelector('#qty-PRI001'))`),'catálogo do garçom');
  await fill(waiter,'#qty-PRI001','1');
  await evaluate(waiter,`document.querySelector('#qty-PRI001').closest('form').querySelector('button').click()`);
  await click(waiter,'.order-draft button[type="submit"]');
  await text(waiter,'Rodada 1');
  const kitchen=await tab('/cozinha');
  await login(kitchen,'00589510');
  await text(kitchen,'Mesa 1 · Rodada 1');
  await click(kitchen,'.round-card button');
  await text(waiter,'Pronto para servir');
  await click(waiter,'.deliver-button');
  await text(kitchen,'Nenhuma rodada aguardando preparo.');
  const guest=await tab('/minha-reserva');
  await text(guest,'Acompanhe sua reserva');
  await fill(guest,'#rc-code',code);
  await fill(guest,'input[type="password"]',PASSWORD);
  await click(guest,'button[type="submit"]');
  await text(guest,'Abrir minha comanda');
  await click(guest,'a.rc-btn');
  await text(guest,'Comanda #101');
  await text(guest,'Todos os itens foram entregues');
  for(const connection of [home,reception,waiter,kitchen,guest]) {
    assert.equal(await evaluate(connection,`localStorage.getItem('food-flow-state-v1')`),null,'sem banco local');
    assert.equal(connection.errors.length,0,'sem exceções JavaScript');
  }
  const layouts=[];
  for(const [page,connection] of [['recepcao',reception],['garcom',waiter],['cozinha',kitchen],['cliente',guest]]) {
    for(const width of [390,1024,1440]) {
      await connection.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
      await delay(100);
      const overflow=await evaluate(connection,'document.documentElement.scrollWidth > window.innerWidth');
      assert.equal(overflow,false,page+' '+width);
      layouts.push({page,width,overflow});
    }
  }
  console.log(JSON.stringify({passed:true,isolatedContexts:5,scenarios:['reserva com senha','recepção → garçom → cozinha em contextos isolados','preparo e entrega sincronizados por HTTP','cliente autentica em outro dispositivo','sem estado de negócio em localStorage'],layouts},null,2));
} finally {
  if (browserConnection)
    await browserConnection.call('Browser.close').catch(() => {});
  connections.forEach((connection) => connection.close());
  if (browser && browser.exitCode === null) browser.kill();
  await server.close();
  await new Promise(resolve => apiServer.close(resolve));
  api.close();
  // O perfil fica no temporário do sistema para não apagar arquivos em uso pelo Chrome.
}

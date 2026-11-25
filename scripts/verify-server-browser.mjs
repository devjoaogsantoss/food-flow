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
  for (let attempt = 0; attempt < 300; attempt++) {
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
  const click = async (tab, selector) => {
    await until(()=>evaluate(tab, `Boolean(document.querySelector(${JSON.stringify(selector)}))`), 'elemento: '+selector);
    return evaluate(
      tab,
      `(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.focus();element.click();})()`,
    );
  };
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
  const {runProductFlow}=await import('./browser-product-flow.mjs');
  await runProductFlow({tab,text,fill,click,evaluate,until,api,profile,base,login});
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

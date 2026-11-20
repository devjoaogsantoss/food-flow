// Verificação local em perfil temporário: nunca usa os dados do navegador pessoal.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const chrome =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'food-flow-browser-'));
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
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
    const { targetId } = await browserConnection.call('Target.createTarget', {
      url: base + path,
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
    await click(tab, '.staff-login button');
  }
  const home = await tab('/');
  await text(home, 'Planeje seu próximo encontro.');
  assert(
    await evaluate(
      home,
      `!!document.querySelector('a[href="/equipe"]') && !document.querySelector('a[href="/recepcao"]')`,
    ),
  );
  const reception = await tab('/recepcao');
  await login(reception, '15152018');
  await text(reception, 'Ana Souza');
  const guest = await tab('/minha-reserva');
  await text(guest, 'Acompanhe sua reserva');
  await fill(guest, '#rc-code', 'FF-0001');
  await click(guest, 'button[type="submit"]');
  await text(guest, 'Reserva confirmada');
  await fill(reception, '#parking-FF-0001', 'sim');
  await click(reception, '.rc-card .rc-btn');
  await text(guest, 'Chegada registrada');
  await fill(reception, '#table-FF-0001', '1');
  await until(
    () =>
      evaluate(
        reception,
        `Array.from(document.querySelectorAll('.rc-card')).find(card => card.innerText.includes('Ana Souza'))?.querySelector('button')?.innerText === 'Confirmar acomodação'`,
      ),
    'botão acomodação',
  );
  await evaluate(
    reception,
    `Array.from(document.querySelectorAll('.rc-card')).find(card => card.innerText.includes('Ana Souza')).querySelector('button').click()`,
  );
  await text(guest, 'Abrir minha comanda');
  await click(guest, 'a.rc-btn');
  await text(guest, 'Comanda #101');
  assert.equal(
    await evaluate(
      guest,
      `document.querySelectorAll('#profile,.staff-session').length`,
    ),
    0,
  );
  assert.equal(
    await evaluate(guest, `document.querySelectorAll('.table-card').length`),
    1,
  );
  const orders = await tab('/pedidos');
  await login(orders, '01510041');
  await text(orders, 'Comanda #101');
  await click(guest, '.menu-path:first-child');
  await until(
    () =>
      evaluate(
        guest,
        'document.querySelector(".category-carousel")?.scrollWidth > document.querySelector(".category-carousel")?.clientWidth',
      ),
    'carrossel horizontal',
  );
  await click(guest, '.carousel-controls button:nth-child(2)');
  await until(
    () =>
      evaluate(
        guest,
        'document.querySelector(".category-carousel").scrollLeft > 0',
      ),
    'rolagem da fileira',
  );
  await until(
    () =>
      evaluate(
        guest,
        'document.querySelectorAll(".category-row").length === 4',
      ),
    'quatro carrosséis',
  );
  assert.equal(
    await evaluate(
      guest,
      'document.querySelectorAll("#menu-query,#menu-category").length',
    ),
    0,
  );
  assert.equal(
    await evaluate(
      guest,
      'document.querySelectorAll(".category-filters button").length',
    ),
    4,
  );
  await evaluate(
    guest,
    `Array.from(document.querySelectorAll('.product-photo-button')).find(button => button.getAttribute('aria-label').includes('Dadinho')).click()`,
  );
  await text(
    guest,
    'Pequenos bocados de tapioca em uma versão inteiramente vegetal',
  );
  await text(guest, 'Peso: Aprox. 84 g');
  assert(await evaluate(guest, 'document.querySelector("dialog").open'));
  for (const width of [390, 1440]) {
    await guest.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    assert(await evaluate(guest, 'document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth'), 'descrição sem corte horizontal');
  }
  await click(guest, '.details-close');
  await until(
    () => evaluate(guest, '!document.querySelector("dialog")'),
    'fechar descrição',
  );
  await evaluate(
    guest,
    `document.querySelector('.product-photo-button').click()`,
  );
  await until(
    () => evaluate(guest, 'document.querySelector("dialog")?.open'),
    'reabrir descrição',
  );
  await guest.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await until(
    () => evaluate(guest, '!document.querySelector("dialog")'),
    'fechar por Escape',
  );
  await evaluate(
    guest,
    `Array.from(document.querySelectorAll('.category-filters button')).find(button => button.innerText === 'Bebidas').click()`,
  );
  assert.equal(
    await evaluate(guest, 'document.querySelectorAll(".category-row").length'),
    3,
  );
  await evaluate(
    guest,
    `Array.from(document.querySelectorAll('.category-filters button')).find(button => button.innerText === 'Bebidas').click()`,
  );
  await text(guest, 'Frango Piccata');
  await fill(guest, '#qty-PRI001', '2');
  await evaluate(
    guest,
    `document.querySelector('#qty-PRI001').closest('form').querySelector('button').click()`,
  );
  await click(guest, '.order-draft button[type="submit"]');
  await text(guest, 'Rodada 1');
  await text(guest, '223,66');
  await click(guest, '.menu-path:nth-child(2)');
  await text(guest, 'Menu Degustação Mar');
  assert.equal(
    await evaluate(
      guest,
      'document.querySelectorAll(".tasting-menu-card").length',
    ),
    3,
  );
  await fill(guest, '#people-DEG001', '2');
  await fill(guest, '#beverage-DEG001', 'BEB004');
  await click(guest, '.tasting-menu-card form button');
  await click(guest, '.order-draft button[type="submit"]');
  await text(guest, 'Rodada 2');
  await text(guest, '677,58');
  await evaluate(
    guest,
    `Array.from(document.querySelectorAll('button')).find(button => button.innerText === 'Chamar garçom').click()`,
  );
  await text(orders, 'Cliente chamou o garçom');
  await click(orders, '.table-card');
  await evaluate(
    orders,
    `Array.from(document.querySelectorAll('button')).find(button => button.innerText === 'Confirmar atendimento').click()`,
  );
  await text(orders, 'Chamada atendida.');
  const kitchen = await tab('/cozinha');
  await login(kitchen, '00589510');
  await text(kitchen, 'Mesa 1 · Rodada 1');
  await click(kitchen, '.round-card button');
  await text(guest, 'Pronto para servir');
  assert.equal(
    await evaluate(
      kitchen,
      `Array.from(document.querySelectorAll('button')).some(button => button.innerText.includes('Confirmar entrega'))`,
    ),
    false,
  );
  await click(orders, '.deliver-button');
  await text(guest, 'Todos os itens foram entregues');
  // Segunda acomodação atualiza a aba de pedidos já aberta.
  await fill(reception, '#parking-FF-0002', 'nao');
  await evaluate(
    reception,
    `Array.from(document.querySelectorAll('.rc-card')).find(card => card.innerText.includes('Bruno Lima')).querySelector('button').click()`,
  );
  await text(reception, 'Selecione a mesa');
  await fill(reception, '#table-FF-0002', '11');
  await evaluate(
    reception,
    `Array.from(document.querySelectorAll('.rc-card')).find(card => card.innerText.includes('Bruno Lima')).querySelector('button').click()`,
  );
  await text(orders, 'Comanda #102');
  // O responsável segue vendo apenas a própria comanda após atualização.
  await delay(150);
  assert.equal(
    await evaluate(guest, `document.querySelectorAll('.table-card').length`),
    1,
  );
  await fill(reception, '#rc-bar', '20');
  await click(reception, '.rc-tables form button');
  await text(reception, '20 de 20 lugares ocupados');
  await orders.call('Page.navigate', { url: base + '/pedidos/' });
  await text(orders, 'Comanda #101');
  await home.call('Page.navigate', { url: base + '/#recepcao' });
  await text(home, 'Acesso por matrícula');
  await home.call('Page.navigate', { url: base + '/#reservas' });
  await text(home, 'Planeje seu próximo encontro.');
  // Matrícula de cozinha recebe somente a tela de cozinha.
  await kitchen.call('Page.navigate', { url: base + '/recepcao' });
  await text(kitchen, 'Você não tem acesso a esta tela');
  assert.equal(
    await evaluate(kitchen, 'document.querySelectorAll(".rc-card").length'),
    0,
  );
  await kitchen.call('Page.navigate', { url: base + '/cozinha' });
  await text(kitchen, 'Fila de preparo por mesa.');
  const layoutResults = [];
  for (const [connection, name] of [
    [home, 'home'],
    [reception, 'recepcao'],
    [guest, 'cliente'],
    [orders, 'pedidos'],
    [kitchen, 'cozinha'],
  ]) {
    for (const width of [390, 1024, 1440]) {
      await connection.call('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 600,
      });
      await delay(100);
      const overflow = await evaluate(
        connection,
        'document.documentElement.scrollWidth > window.innerWidth',
      );
      layoutResults.push({ page: name, width, overflow });
    }
    assert.equal(connection.errors.length, 0, name + ': erros JS');
  }
  assert(
    layoutResults.every((result) => !result.overflow),
    JSON.stringify(layoutResults),
  );
  // Confere os arquivos de imagem nos dois caminhos e guarda capturas para inspeção.
  const screenshotDir = join(profile, 'screenshots');
  await mkdir(screenshotDir, { recursive: true });
  await click(home, '.menu-path:first-child');
  await evaluate(
    home,
    `document.querySelectorAll('.catalog-product img').forEach(img => { img.loading = 'eager'; })`,
  );
  await until(
    () =>
      evaluate(
        home,
        `Array.from(document.querySelectorAll('.catalog-product img')).every(img => img.complete && img.naturalWidth > 0)`,
      ),
    'fotos à la carte',
  );
  await home.call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(home, 'document.querySelector("#cardapio").scrollIntoView()');
  const catalogScreenshot = await home.call('Page.captureScreenshot', {
    format: 'png',
  });
  await writeFile(
    join(screenshotDir, 'a-la-carte.png'),
    Buffer.from(catalogScreenshot.data, 'base64'),
  );
  await click(home, '.menu-path:nth-child(2)');
  await evaluate(
    home,
    `document.querySelectorAll('.tasting-menu-card img').forEach(img => { img.loading = 'eager'; })`,
  );
  await until(
    () =>
      evaluate(
        home,
        `Array.from(document.querySelectorAll('.tasting-menu-card img')).every(img => img.complete && img.naturalWidth > 0)`,
      ),
    'fotos degustação',
  );
  const tastingScreenshot = await home.call('Page.captureScreenshot', {
    format: 'png',
  });
  await writeFile(
    join(screenshotDir, 'degustacao.png'),
    Buffer.from(tastingScreenshot.data, 'base64'),
  );
  console.log(
    JSON.stringify(
      {
        passed: true,
        screenshotDir,
        scenarios: [
          'home e rotas',
          'chegada/acomodação',
          'consulta em outra aba',
          'comanda do cliente',
          'pedidos atualizados em outra aba',
          'bar',
          'matrículas e telas por perfil',
          'à la carte e degustação com conta e estacionamento',
          'chamar garçom e fila de cozinha',
          'hashes antigos',
          'layout 390/1024/1440',
        ],
        layouts: layoutResults,
      },
      null,
      2,
    ),
  );
} finally {
  if (browserConnection)
    await browserConnection.call('Browser.close').catch(() => {});
  connections.forEach((connection) => connection.close());
  if (browser && browser.exitCode === null) browser.kill();
  await server.close();
  // O perfil fica no temporário do sistema para não apagar arquivos em uso pelo Chrome.
}

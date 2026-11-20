import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  menu,
  tastingMenus,
  filterMenu,
  buildTastingItem,
} from '../src/lib/menu.js';
import { calculateBill } from '../src/lib/billing.js';
import { createReceptionApi } from '../src/services/receptionApi.js';
import { createOrdersApi } from '../src/services/ordersApi.js';
import sourceCatalog from '../src/data/menu.json' with { type: 'json' };
import productDescriptions from '../src/data/product-descriptions.json' with { type: 'json' };

test('descrições compartilham identidade pelo nome e preservam os dados da planilha', () => {
  const products = [...menu, ...tastingMenus.flatMap((entry) => entry.items)];
  const nonDrinks = products.filter((item) => item.category !== 'Bebida');
  assert.equal(new Set(nonDrinks.map((item) => item.name)).size, 12);
  for (const item of nonDrinks) {
    assert.equal(item.detailDescription, productDescriptions[item.name]);
    assert(item.detailDescription.length > 50, item.name);
  }
  for (const item of products) {
    assert(
      products
        .filter((other) => other.id === item.id)
        .every((other) => other.name === item.name),
      item.id,
    );
    if (item.category === 'Bebida')
      assert.equal(item.detailDescription, productDescriptions[item.id] ?? '');
  }
  for (let index = 0; index < tastingMenus.length; index++) {
    const original = sourceCatalog.tastingMenus[index];
    assert.equal(tastingMenus[index].priceCents, original.priceCents);
    assert.equal(tastingMenus[index].items.length, original.items.length);
    tastingMenus[index].items.forEach((item, position) => {
      const source = original.items[position];
      assert.equal(item.sourceId, source.id);
      for (const field of [
        'name',
        'description',
        'priceCents',
        'available',
        'category',
        'subcategory',
      ])
        assert.equal(item[field], source[field]);
    });
  }
  const bruschetta = tastingMenus[1].items.find((item) => item.id === 'ENT004');
  assert.equal(bruschetta.sourceId, 'ENT001');
  assert.match(bruschetta.detailDescription, /^Pão tostado/);
  assert.match(
    menu.find((item) => item.id === 'ENT001').detailDescription,
    /^Ostras frescas/,
  );
});

function setup() {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  return {
    reception: createReceptionApi({ storage }),
    orders: createOrdersApi({ storage }),
  };
}
test('CSV fornece 15 produtos únicos por código e três menus com preço próprio', () => {
  assert.equal(menu.length, 15);
  assert.equal(new Set(menu.map((item) => item.id)).size, 15);
  assert.deepEqual(
    tastingMenus.map((item) => item.priceCents),
    [22696, 21796, 21535],
  );
  assert.equal(filterMenu('PRI003')[0].priceCents, 9990);
  assert.equal(filterMenu('', 'BEB').length, 6);
  assert.equal(filterMenu('PRI004').length, 0); // Exclusivo do degustação vegano.
  assert.equal(
    tastingMenus[1].items.find((item) => item.id === 'ENT004').name,
    'Bruschetta com raggu de paleta',
  );
  assert.equal(
    menu.find((item) => item.id === 'ENT001').name,
    'Ostra fresca de Itapissuma',
  );
});
test('todos os produtos e menus têm imagem local disponível', () => {
  for (const item of [...menu, ...tastingMenus])
    assert(
      existsSync(
        new URL(`../public/images/menu/${item.id}.png`, import.meta.url),
      ),
      item.id,
    );
});
test('à la carte calcula taxas independentes sobre subtotal e estacionamento único', () => {
  const bill = calculateBill({
    parkingRequired: true,
    rounds: [
      { status: 'em preparo', items: [{ priceCents: 8990, quantity: 2 }] },
    ],
  });
  assert.equal(bill.aLaCarteCents, 17980);
  assert.equal(bill.serviceCents, 1798);
  assert.equal(bill.couvertCents, 1798);
  assert.equal(bill.parkingCents, 790);
  assert.equal(bill.totalCents, 22366);
  assert.equal(bill.hasPendingRounds, true);
});
test('degustação multiplica pessoas e cobra somente estacionamento adicional', () => {
  const item = buildTastingItem(
    { menuId: 'DEG001', people: 2, beverageCode: 'BEB004' },
    2,
  );
  const bill = calculateBill({
    parkingRequired: true,
    rounds: [{ status: 'entregue', items: [item] }],
  });
  assert.equal(bill.totalCents, 46182);
  assert.equal(bill.serviceCents, 0);
  assert.equal(bill.couvertCents, 0);
  assert.equal(bill.hasPendingRounds, false);
  assert.equal(item.courses.length, 3);
  assert.equal(item.beverage.name, 'Taça de vinho branco');
});
test('mistura dos caminhos cobra taxas só do à la carte e não duplica estacionamento', () => {
  const bill = calculateBill({
    parkingRequired: true,
    rounds: [
      {
        status: 'entregue',
        items: [{ kind: 'degustacao', priceCents: 21796, quantity: 2 }],
      },
      { status: 'entregue', items: [{ priceCents: 1690, quantity: 2 }] },
    ],
  });
  assert.equal(bill.totalCents, 48438);
  assert.equal(bill.serviceCents, 338);
  assert.equal(bill.couvertCents, 338);
  assert.equal(bill.parkingCents, 790);
  assert.equal(
    calculateBill({
      rounds: [{ items: [{ price: 35, quantity: 2 }], status: 'entregue' }],
    }).totalCents,
    8400,
  );
});
test('não aceita pessoas fracionárias, bebida de outro menu ou horário inválido', () => {
  for (const values of [
    { people: 1.5 },
    { people: 3 },
    { beverageCode: 'BEB011' },
    { servingTime: '25:99' },
  ]) {
    assert.throws(() =>
      buildTastingItem(
        { menuId: 'DEG001', people: 2, beverageCode: 'BEB004', ...values },
        2,
      ),
    );
  }
});
test('check-in transmite estacionamento à comanda e permite correção pela recepção', async () => {
  const { reception, orders } = setup();
  await reception.registerArrival('FF-0001', 'recepcao', true);
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  assert.equal(command.parkingRequired, true);
  await reception.updateParking('FF-0001', false, 'recepcao');
  assert.equal((await orders.getCommand(command.id)).parkingRequired, false);
  await assert.rejects(
    () => reception.updateParking('FF-0001', true, 'garcom'),
    { code: 'FORBIDDEN' },
  );
});
test('envio valida preço do catálogo, pessoas acumuladas e mantém pedido após falha', async () => {
  const { reception, orders } = setup();
  await reception.registerArrival('FF-0001', 'recepcao', false);
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  const tasting = {
    kind: 'degustacao',
    menuId: 'DEG003',
    people: 2,
    beverageCode: 'BEB011',
  };
  await orders.createOrder(command.id, [tasting], 'cliente', {
    notes: 'Servir bebida junto.',
  });
  await assert.rejects(
    () => orders.createOrder(command.id, [{ ...tasting, people: 1 }], 'garcom'),
    /pessoas/,
  );
  await orders.createOrder(
    command.id,
    [{ productId: 'BEB005', quantity: 1, priceCents: 1 }],
    'garcom',
  );
  const saved = await orders.getCommand(command.id);
  assert.equal(saved.rounds.length, 2);
  assert.equal(saved.rounds[0].items[0].priceCents, 21535);
  assert.equal(saved.rounds[0].notes, 'Servir bebida junto.');
  assert.equal(saved.rounds[1].items[0].priceCents, 1690);
});
test('chamada repetida não duplica e cozinha não confirma a entrega', async () => {
  const { reception, orders } = setup();
  await reception.registerArrival('FF-0001', 'recepcao', false);
  const { command } = await reception.confirmSeating('FF-0001', 1, 'recepcao');
  const first = await orders.callWaiter(command.id);
  assert.equal((await orders.callWaiter(command.id)).id, first.id);
  await orders.attendCall(command.id, first.id);
  assert.equal(
    (await orders.getCommand(command.id)).calls[0].status,
    'atendida',
  );
  const round = await orders.createOrder(
    command.id,
    [{ productId: 'PRI001', quantity: 1 }],
    'cliente',
  );
  await orders.markRoundReady(command.id, round.id);
  const ready = (await orders.getCommand(command.id)).rounds[0];
  assert(ready.readyAt);
  assert.equal(ready.status, 'em preparo');
});

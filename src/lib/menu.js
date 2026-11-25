import catalog from '../data/menu.json' with { type: 'json' };
import tastingDescriptions from '../data/tasting-descriptions.json' with { type: 'json' };
import productDescriptions from '../data/product-descriptions.json' with { type: 'json' };
import { createUuid } from './uuid.js';
export const money = (cents) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
function describeProduct(item) {
  // Confere código e nome: ENT001 identifica dois pratos distintos na fonte.
  const id =
    item.id === 'ENT001' && item.name === 'Bruschetta com raggu de paleta'
      ? 'ENT004'
      : item.id;
  return {
    ...item,
    id,
    sourceId: item.id,
    detailDescription:
      productDescriptions[item.name] ??
      (item.category === 'Bebida' ? productDescriptions[item.id] : undefined) ??
      item.detailDescription ??
      '',
  };
}

export const menu = catalog.aLaCarte.map((item) => ({
  ...describeProduct(item),
  price: item.priceCents / 100,
}));
export const tastingMenus = catalog.tastingMenus.map((menu) => ({
  ...menu,
  description: tastingDescriptions[menu.id] ?? '',
  items: menu.items.map(describeProduct),
}));
export const categories = [
  { prefix: 'ENT', label: 'Entradas' },
  { prefix: 'PRI', label: 'Principais' },
  { prefix: 'SOB', label: 'Sobremesas' },
  { prefix: 'BEB', label: 'Bebidas' },
];

export function filterMenu(query = '', prefix = '') {
  const search = query.trim().toLocaleUpperCase('pt-BR');
  return menu.filter(
    (item) =>
      item.available &&
      item.id.startsWith(prefix) &&
      `${item.id} ${item.name} ${item.subcategory}`
        .toLocaleUpperCase('pt-BR')
        .includes(search),
  );
}

export const productImage = (id) => `/images/menu/${id}.png`;

// Congela o nome, preço, composição e escolha de bebida no momento do pedido.
export function buildTastingItem(
  { menuId, people, beverageCode, servingTime = '' },
  maxPeople = Infinity,
) {
  const selected = tastingMenus.find((item) => item.id === menuId);
  const count = Number(people);
  if (!selected) throw new Error('Menu degustação não encontrado.');
  if (!Number.isInteger(count) || count < 1 || count > maxPeople) {
    throw new Error('Informe um número de pessoas compatível com a mesa.');
  }
  const beverage = selected.items.find(
    (item) =>
      item.id === beverageCode && item.category === 'Bebida' && item.available,
  );
  if (!beverage) throw new Error('Escolha uma das bebidas deste menu.');
  if (servingTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(servingTime))
    throw new Error('Horário de servir inválido.');
  return {
    id: createUuid(),
    kind: 'degustacao',
    productId: selected.id,
    name: selected.name,
    priceCents: selected.priceCents,
    price: selected.priceCents / 100,
    quantity: count,
    status: 'em preparo',
    beverage: { code: beverage.id, name: beverage.name },
    servingTime,
    courses: selected.items
      .filter((item) => item.category !== 'Bebida')
      .map((item) => ({ ...item })),
  };
}

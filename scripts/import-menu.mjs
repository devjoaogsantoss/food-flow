import { readFile, writeFile } from 'node:fs/promises';

// CSV da planilha com campos entre aspas, vírgulas e quebras de linha.
export function parseCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (quoted) throw new Error('CSV com aspas incompletas.');
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const text = await readFile(
  new URL('../src/data/cardapio.csv', import.meta.url),
  'utf8',
);
const catalog = { source: 'cardapio.csv', aLaCarte: [], tastingMenus: [] };
let section;
const cents = (value) =>
  Math.round(Number(value.replace(/[^\d,]/g, '').replace(',', '.')) * 100);
for (const row of parseCsv(text)) {
  const title = row[1]?.trim();
  if (title === 'Cardápio a La Carte') section = catalog.aLaCarte;
  const tasting = title?.match(/^Menu Degustação (.+) R\$([\d,]+)$/);
  if (tasting) {
    const menu = {
      id: 'DEG' + String(catalog.tastingMenus.length + 1).padStart(3, '0'),
      name: 'Menu Degustação ' + tasting[1],
      priceCents: cents(tasting[2]),
      items: [],
    };
    catalog.tastingMenus.push(menu);
    section = menu.items;
  }
  if (!/^(BEB|ENT|PRI|SOB)\d{3}$/.test(title ?? '')) continue;
  if (!section) throw new Error('Produto fora de seção: ' + title);
  if (section.some((item) => item.id === title))
    throw new Error('Código duplicado na seção: ' + title);
  const priceCents = cents(row[6]);
  if (!Number.isInteger(priceCents) || priceCents <= 0)
    throw new Error('Preço inválido: ' + title);
  section.push({
    id: title,
    category: row[2],
    subcategory: row[3],
    name: row[4],
    description: row[5],
    priceCents,
    available: row[7]?.trim().toLowerCase() === 'sim',
  });
}
await writeFile(
  new URL('../src/data/menu.json', import.meta.url),
  JSON.stringify(catalog, null, 2) + '\n',
);
console.log(
  `Importados ${catalog.aLaCarte.length} produtos e ${catalog.tastingMenus.length} menus.`,
);

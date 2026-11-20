// Inventário único da demonstração: 10 mesas de 2, 6 de 4 e 2 de 8 lugares.
export function buildTables() {
  return [...Array(10).fill(2), ...Array(6).fill(4), ...Array(2).fill(8)].map(
    (capacity, index) => ({
      id: index + 1,
      number: index + 1,
      capacity,
      status: [3, 12].includes(index + 1) ? 'aguardando_limpeza' : 'pronta',
    }),
  );
}

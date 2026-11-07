export const serviceTimes = ['17:45', '20:00', '22:15'];
export const tableCategories = [2, 4, 8];
export function localDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function validateDate(value, today = localDateString()) {
  if (!value) return 'Selecione uma data para explorar os horários.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Selecione uma data válida.';
  const date = new Date(value + 'T12:00:00');
  if (Number.isNaN(date.getTime()) || localDateString(date) !== value)
    return 'Selecione uma data válida.';
  if (value < today) return 'Selecione hoje ou uma data futura.';
  if ([0, 1].includes(date.getDay()))
    return 'Não há reservas aos domingos e às segundas. Escolha uma data de terça a sábado.';
  return '';
}

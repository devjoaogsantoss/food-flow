export const serviceTimes = ['17:45', '20:00', '22:15'];
export const tableCategories = [2, 4, 8];
// Associação aprovada pelo usuário em 24/11/2026; taxa por mesa, em centavos.
export const reservationFees = { 2: 5000, 4: 10000, 8: 20000 };

export function validateResponsible(input) {
  const phone = String(input.whatsapp ?? '').trim();
  const digits = phone.replace(/\D/g, '');
  if (String(input.guestName ?? '').trim().length < 2 ||
      !/^\+?[\d\s().-]{10,25}$/.test(phone) || digits.length < 10 || digits.length > 15 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email ?? '').trim()))
    return 'Informe nome, WhatsApp e e-mail válidos.';
  return '';
}

export function serviceStart(date, service) {
  return new Date(`${date}T${service}:00-03:00`);
}

export function validateReservationChoice(choice, now = new Date()) {
  const error = validateDate(choice.date, localDateString(now));
  if (error) return error;
  if (!serviceTimes.includes(choice.service)) return 'Selecione um serviço válido.';
  if (!tableCategories.includes(Number(choice.tableCategory)))
    return 'Selecione uma categoria válida.';
  if (serviceStart(choice.date, choice.service) <= now)
    return 'Este serviço já começou. Escolha outro horário ou data.';
  return '';
}
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

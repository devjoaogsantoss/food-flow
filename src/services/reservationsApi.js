import { remoteEnabled, remoteReservations } from './remoteApi.js';
import { reservationFees, serviceStart, validateReservationChoice, validateResponsible, localDateString } from '../lib/reservations.js';
import { buildSeed } from './receptionApi.js';
import { browserStorage, readState, writeState, withStateLock } from './localStore.js';

function fail(code, message) {
  return Object.assign(new Error(message), { code });
}

function contact(input) {
  const guestName = String(input.guestName ?? '').trim();
  const whatsapp = String(input.whatsapp ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const error = validateResponsible({ guestName, whatsapp, email });
  if (error) throw fail('INVALID_INPUT', error);
  return { guestName, whatsapp, email };
}

// Adaptador local: compartilha estado e lock com recepção/pedidos.
// A futura API deve repetir validações, autorização e transação no servidor.
export function createReservationsApi({ storage, now = () => new Date() } = {}) {
  const store = () => storage ?? browserStorage();
  function read() {
    const state = readState(store());
    state.reception ??= buildSeed(localDateString(now()));
    state.reception.waitlist ??= [];
    return state;
  }
  function choice(input) {
    const result = { date: input.date, service: input.service, tableCategory: Number(input.tableCategory) };
    const error = validateReservationChoice(result, now());
    if (error) throw fail('INVALID_INPUT', error);
    return result;
  }
  function availability(state, input) {
    const capacity = state.reception.tables.filter(t => t.capacity === input.tableCategory).length;
    const occupied = state.reception.reservations.filter(r => r.date === input.date &&
      r.service === input.service && r.tableCategory === input.tableCategory && r.status !== 'cancelada').length;
    return { available: occupied < capacity, remaining: Math.max(0, capacity - occupied),
      feeCents: reservationFees[input.tableCategory] };
  }
  const api = {
    async getAvailability(input) {
      const selected = choice(input);
      const state = read();
      const result = availability(state, selected);
      const suggestions = [];
      if (!result.available) {
        for (let i = 1; i <= 14 && suggestions.length < 3; i++) {
          const date = new Date(selected.date + 'T12:00:00');
          date.setDate(date.getDate() + i);
          const alternative = { ...selected, date: localDateString(date) };
          if (!validateReservationChoice(alternative, now()) && availability(state, alternative).available)
            suggestions.push(alternative.date);
        }
      }
      return { ...result, suggestions };
    },
    async confirm(input) {
      const selected = choice(input);
      const responsible = contact(input);
      const partySize = Number(input.partySize);
      if (!Number.isInteger(partySize) || partySize < 1 || partySize > selected.tableCategory)
        throw fail('INVALID_INPUT', 'Informe a quantidade de pessoas dentro da capacidade da mesa.');
      if (input.paymentStatus !== 'aprovado')
        throw fail('PAYMENT_DECLINED', 'Pagamento recusado (simulado). Tente novamente.');
      const state = read();
      if (!availability(state, selected).available)
        throw fail('CONFLICT', 'Não há mais vagas. Escolha outra data ou entre na lista de espera.');
      const reservation = {
        id: 'FF-' + crypto.randomUUID().toUpperCase(), ...selected, ...responsible, partySize,
        status: 'reservada', createdAt: now().toISOString(),
        payment: { status: 'aprovado', amountCents: reservationFees[selected.tableCategory], simulated: true },
        arrivedAt: null, waitingSince: null, waitingTableId: null,
        seatedAt: null, tableId: null, commandId: null,
      };
      state.reception.reservations.push(reservation);
      writeState(state, store());
      return reservation;
    },
    async getReservation(code) {
      const id = String(code ?? '').trim().toUpperCase();
      const found = read().reception.reservations.find(r => r.id === id);
      if (!found) throw fail('NOT_FOUND', 'Reserva não encontrada.');
      return found;
    },
    async cancel(code) {
      const state = read();
      const reservation = state.reception.reservations.find(r => r.id === String(code).trim().toUpperCase());
      if (!reservation) throw fail('NOT_FOUND', 'Reserva não encontrada.');
      if (reservation.status === 'cancelada') return reservation;
      if (reservation.status !== 'reservada')
        throw fail('INVALID_STATE', 'Após o check-in, procure a recepção para encerrar a visita.');
      const eligible = serviceStart(reservation.date, reservation.service) - now() >= 12 * 3600000;
      reservation.status = 'cancelada';
      reservation.cancelledAt = now().toISOString();
      reservation.refund = { simulated: true, eligible, amountCents: eligible ? (reservation.payment?.amountCents ?? 0) : 0 };
      writeState(state, store());
      return reservation;
    },
    async joinWaitlist(input) {
      const selected = choice(input);
      const responsible = contact(input);
      const state = read();
      if (availability(state, selected).available)
        throw fail('INVALID_STATE', 'Há vagas disponíveis. Você pode fazer uma reserva.');
      if (state.reception.waitlist.some(e => e.date === selected.date && e.service === selected.service &&
          e.whatsapp.replace(/\D/g, '') === responsible.whatsapp.replace(/\D/g, '') && ['aguardando', 'contatado'].includes(e.status)))
        throw fail('CONFLICT', 'Este contato já está na lista deste serviço.');
      const entry = { id: crypto.randomUUID(), ...selected, ...responsible, status: 'aguardando', createdAt: now().toISOString() };
      state.reception.waitlist.push(entry);
      writeState(state, store());
      return entry;
    },
  };
  return Object.fromEntries(Object.entries(api).map(([name, action]) => [name,
    ['confirm', 'cancel', 'joinWaitlist'].includes(name)
      ? (...args) => withStateLock(store(), () => action(...args)) : action]));
}
export const reservationsApi = remoteEnabled ? remoteReservations : createReservationsApi();

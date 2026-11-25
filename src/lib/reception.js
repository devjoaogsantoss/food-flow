import { serviceTimes, serviceStart } from './reservations.js';

// Perfil que pode executar as ações da recepção (docs/regras-de-negocio.md).
export const RECEPTION_ROLE = 'recepcao';

// Valor usado no filtro quando a recepção quer ver todos os serviços do dia.
export const ALL_SERVICES = 'todos';

export const tableStatusLabels = {
  pronta: 'Pronta',
  ocupada: 'Ocupada',
  aguardando_limpeza: 'Aguardando limpeza',
  designada: 'Aguardando acomodação',
};

export const reservationStatusLabels = {
  reservada: 'Com reserva',
  chegou: 'Chegou',
  mesa_definida: 'Mesa definida',
  em_espera: 'Em espera',
  acomodada: 'Acomodada',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

// "Ação" e "Acao" devem encontrar o mesmo texto: removemos acentos e caixa.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(reservation, query) {
  const text = normalizeText(query);
  if (!text) return true;
  return (
    normalizeText(reservation.id).includes(text) ||
    normalizeText(reservation.guestName).includes(text)
  );
}

// Decisão: com texto de busca, procuramos no dia inteiro. Assim o cliente que
// chega em um serviço diferente do reservado ainda é encontrado.
export function filterReservations(
  reservations,
  { date, service = ALL_SERVICES, query = '' } = {},
) {
  const searching = normalizeText(query) !== '';
  return reservations.filter((reservation) => {
    if (date && reservation.date !== date) return false;
    if (!searching && service !== ALL_SERVICES) {
      if (reservation.service !== service) return false;
    }
    return matchesQuery(reservation, query);
  });
}

// Três grupos separados: tem reserva, chegou (inclui quem espera) e acomodado.
export function groupReservations(reservations) {
  const groups = { reserved: [], arrived: [], seated: [] };
  for (const reservation of reservations) {
    if (reservation.status === 'reservada') groups.reserved.push(reservation);
    else if (['acomodada', 'encerrada'].includes(reservation.status))
      groups.seated.push(reservation);
    else if (['chegou', 'em_espera', 'mesa_definida'].includes(reservation.status)) groups.arrived.push(reservation);
    else if (reservation.status === 'cancelada') (groups.cancelled ??= []).push(reservation);
  }
  return groups;
}

export function tablesForCategory(tables, category) {
  return tables.filter((table) => table.capacity === Number(category));
}

export function isValidService(service) {
  return service === ALL_SERVICES || serviceTimes.includes(service);
}

// Texto mostrado ao responsável. Só a acomodação libera pedidos.
export function describeGuestStatus(reservation, table = null) {
  switch (reservation.status) {
    case 'cancelada':
      return { step: 0, canOrder: false, title: 'Reserva cancelada', message: 'Esta reserva foi cancelada. Faça uma nova reserva para outra visita.' };
    case 'encerrada':
      return {
        step: 3,
        canOrder: false,
        title: 'Visita encerrada',
        message: 'Saída registrada pela recepção.',
      };
    case 'reservada':
      return {
        step: 1,
        canOrder: false,
        title: 'Reserva confirmada',
        message:
          'Apresente-se no balcão da recepção ao chegar. Os pedidos serão liberados depois da acomodação.',
      };
    case 'chegou':
      return {
        step: 2,
        canOrder: false,
        title: 'Chegada registrada',
        message:
          'A recepção está preparando sua mesa. Os pedidos serão liberados depois da acomodação.',
      };
    case 'mesa_definida':
      return { step: 2, canOrder: false, title: 'Sua mesa está definida', message: `Aguarde o garçom ou metre acompanhar seu grupo à mesa ${reservation.assignedTableId}. Os pedidos serão liberados após a acomodação.` };
    case 'em_espera':
      return {
        step: 2,
        canOrder: false,
        title: 'Sua mesa ainda não está pronta',
        message:
          'Aguarde no lounge ou no bar. A recepção confirmará a acomodação assim que a mesa estiver pronta. Os pedidos continuam bloqueados até lá.',
      };
    case 'acomodada':
      return {
        step: 3,
        canOrder: true,
        title: 'Mesa acomodada',
        message: table
          ? `Você está na mesa ${table.number}. Sua comanda #${reservation.commandId} está aberta para você e para o garçom.`
          : `Sua comanda #${reservation.commandId} está aberta para você e para o garçom.`,
      };
    default:
      return {
        step: 0,
        canOrder: false,
        title: 'Situação desconhecida',
        message: 'Procure a recepção.',
      };
  }
}

// Indicador informativo: não cancela, libera vagas ou aplica penalidades.
export function arrivalDelayMinutes(reservation, now = new Date()) {
  if (reservation.status !== 'reservada') return 0;
  const elapsed = now - serviceStart(reservation.date, reservation.service);
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 60000)) : 0;
}

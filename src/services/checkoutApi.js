import { checkoutSummary } from '../lib/billing.js';
import { createUuid } from '../lib/uuid.js';
import { browserStorage, readState, writeState, withStateLock } from './localStore.js';
import { remoteEnabled, remoteCheckout } from './remoteApi.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

export function createCheckoutApi({ storage, now = () => new Date(), recordSettlement = () => {} } = {}) {
  const store = () => storage ?? browserStorage();
  return {
    async close(commandId, input, actor) {
      return withStateLock(store(), () => {
        const state = readState(store());
        const command = state.orders.commands.find(c => c.id === Number(commandId));
        if (!command) fail('NOT_FOUND', 'Comanda não encontrada.');
        if (!actor || !['cliente', 'garcom'].includes(actor.role)) fail('FORBIDDEN', 'Perfil não autorizado para fechar a conta.');
        if (actor.role === 'cliente' && actor.principal !== command.reservationId) fail('FORBIDDEN', 'Esta comanda não pertence à sua sessão.');
        if (command.status !== 'aberta' || command.settlement) fail('CONFLICT', 'Esta comanda já foi encerrada.');
        const reservation = state.reception?.reservations.find(r => r.id === command.reservationId);
        if (!reservation || reservation.status !== 'acomodada' || reservation.commandId !== command.id) fail('INVALID_STATE', 'A comanda precisa estar vinculada a uma reserva acomodada.');
        const bill = checkoutSummary(command);
        if (![bill.totalCents, bill.creditCents].every(v => Number.isSafeInteger(v) && v >= 0)) fail('INVALID_STATE', 'Valores financeiros inválidos.');
        if (bill.hasPendingRounds || bill.hasPendingItems) fail('INVALID_STATE', 'Aguarde a entrega de todos os itens antes de fechar.');
        if (bill.parkingPending) fail('INVALID_STATE', 'A recepção precisa informar o estacionamento.');
        if (bill.manualRequired) fail('MANUAL_REQUIRED', 'Consumo inferior ao crédito: procure atendimento presencial. A diferença depende de aprovação da equipe; nenhuma liquidação foi registrada.');
        if (input.expectedTotalCents !== bill.totalCents || input.expectedCreditCents !== bill.creditCents) fail('CONFLICT', 'A conta mudou. Atualize o resumo antes de confirmar.');
        const channel = actor.role === 'cliente' ? 'digital' : 'presencial';
        const methods = channel === 'digital' ? ['pix', 'cartao_credito', 'credito'] : ['dinheiro', 'cartao_presencial', 'dividido', 'credito', 'sem_consumo'];
        if (!methods.includes(input.method)) fail('INVALID_INPUT', 'Forma de pagamento inválida para este canal.');
        if (!bill.hasConsumption && (channel !== 'presencial' || input.method !== 'sem_consumo')) fail('INVALID_STATE', 'Sem consumo: solicite encerramento presencial à equipe.');
        if (bill.hasConsumption && input.method === 'sem_consumo') fail('INVALID_STATE', 'Esta comanda possui consumo.');
        if (bill.hasConsumption && ((bill.dueCents === 0) !== (input.method === 'credito'))) fail('INVALID_INPUT', 'Use crédito para saldo zero ou uma forma de pagamento para saldo positivo.');
        if (input.paymentStatus !== 'aprovado') {
          if (input.paymentStatus === 'recusado') fail('PAYMENT_DECLINED', 'Pagamento recusado (simulado). A comanda permanece aberta.');
          fail('INVALID_INPUT', 'Informe aprovação ou recusa simulada.');
        }
        const settlement = {
          reference: createUuid(), channel, method: input.method, simulated: true,
          status: bill.hasConsumption ? 'paga' : 'sem_consumo',
          totalCents: bill.totalCents, creditCents: bill.creditCents,
          appliedCreditCents: bill.hasConsumption ? Math.min(bill.totalCents, bill.creditCents) : 0,
          amountCents: bill.hasConsumption ? bill.dueCents : 0,
          retainedReservationCents: bill.hasConsumption ? 0 : bill.creditCents,
          createdAt: now().toISOString(), actor: actor.principal,
        };
        command.status = 'fechada';
        command.closedAt = settlement.createdAt;
        command.settlement = settlement;
        for (const call of command.calls ?? []) {
          if (call.status === 'pendente') { call.status = 'atendida'; call.attendedAt = settlement.createdAt; }
        }
        // A mesa continua ocupada até a recepção registrar saída e limpeza.
        writeState(state, store());
        recordSettlement(command, settlement);
        return command;
      });
    },
  };
}

export const checkoutApi = remoteEnabled ? remoteCheckout : createCheckoutApi();

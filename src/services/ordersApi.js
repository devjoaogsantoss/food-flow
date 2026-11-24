import { remoteEnabled, remoteOrders } from './remoteApi.js';
import {
  browserStorage,
  readState,
  writeState,
  withStateLock,
} from './localStore.js';

import { menu, buildTastingItem } from '../lib/menu.js';
export { menu } from '../lib/menu.js';

export function createOrdersApi({ storage } = {}) {
  const store = () => storage ?? browserStorage();
  const readData = () => readState(store()).orders;
  function saveData(data) {
    const state = readState(store());
    state.orders = data;
    writeState(state, store());
  }
  const api = {
    async getTables() {
      const data = readData();
      return data.tables;
    },

    async getCommands() {
      const data = readData();
      return data.commands;
    },

    async getCommand(commandId) {
      const data = readData();

      return (
        data.commands.find((command) => command.id === Number(commandId)) ||
        null
      );
    },

    async createOrder(commandId, items, source, options = {}) {
      const data = readData();

      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );

      if (!command || command.status !== 'aberta') {
        throw new Error('Comanda não encontrada ou fechada.');
      }

      if (!['cliente', 'garcom'].includes(source)) {
        throw new Error('Perfil de pedido inválido.');
      }

      if (command.reservationId) {
        const reservation = readState(store()).reception?.reservations.find(
          (item) => item.id === command.reservationId,
        );
        if (
          reservation?.status !== 'acomodada' ||
          reservation.commandId !== command.id
        ) {
          throw new Error('Pedidos bloqueados até a acomodação.');
        }
      } else if (source === 'cliente') {
        throw new Error(
          'Comanda antiga sem reserva vinculada. Procure a equipe.',
        );
      }

      if (!Array.isArray(items) || !items.length) {
        throw new Error('Adicione pelo menos um produto.');
      }

      const roundItems = items.map((item) => {
        if (item.kind === 'degustacao') {
          const reservation = readState(store()).reception?.reservations.find(
            (entry) => entry.id === command.reservationId,
          );
          if (!reservation)
            throw new Error(
              'Vincule uma reserva à comanda para informar o número de pessoas.',
            );
          const orderedPeople = command.rounds
            .flatMap((round) => round.items)
            .filter((entry) => entry.kind === 'degustacao')
            .reduce((sum, entry) => sum + entry.quantity, 0);
          const draftPeople = items
            .filter((entry) => entry.kind === 'degustacao')
            .reduce((sum, entry) => sum + Number(entry.people), 0);
          if (orderedPeople + draftPeople > reservation.partySize)
            throw new Error(
              'A degustação já atende ao número de pessoas da mesa.',
            );
          return buildTastingItem(item, reservation.partySize);
        }
        const product = menu.find(
          (product) => product.id === item.productId && product.available,
        );

        if (!product) {
          throw new Error('Produto não encontrado.');
        }

        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error('Quantidade inválida.');
        }

        return {
          id: crypto.randomUUID(),
          productId: product.id,
          kind: 'a-la-carte',
          name: product.name,
          priceCents: product.priceCents,
          price: product.price,
          quantity,
          status: 'em preparo',
        };
      });

      const round = {
        id: crypto.randomUUID(),
        number: command.rounds.length + 1,
        source,
        notes: String(options.notes ?? '')
          .trim()
          .slice(0, 500),
        status: 'em preparo',
        createdAt: new Date().toISOString(),
        items: roundItems,
      };

      command.rounds.push(round);

      saveData(data);

      return round;
    },

    async callWaiter(commandId, type = 'atendimento') {
      if (!['atendimento', 'fechamento_presencial'].includes(type))
        throw new Error('Tipo de chamada inválido.');
      const data = readData();
      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );
      if (!command || command.status !== 'aberta')
        throw new Error('Comanda não encontrada ou fechada.');
      const pending = (command.calls ?? []).find(
        (call) => call.status === 'pendente' && (call.type ?? 'atendimento') === type,
      );
      if (pending) return pending;
      const call = {
        id: crypto.randomUUID(),
        status: 'pendente',
        type,
        createdAt: new Date().toISOString(),
      };
      command.calls ??= [];
      command.calls.push(call);
      saveData(data);
      return call;
    },

    async attendCall(commandId, callId) {
      const data = readData();
      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );
      const call = command?.calls?.find((item) => item.id === callId);
      if (!call) throw new Error('Chamada não encontrada.');
      if (command.status !== 'aberta') throw new Error('Comanda fechada.');
      if (call.status === 'atendida') return call;
      call.status = 'atendida';
      call.attendedAt = new Date().toISOString();
      saveData(data);
    },

    async markRoundReady(commandId, roundId) {
      const data = readData();
      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );
      const round = command?.rounds.find((item) => item.id === roundId);
      if (!round || command.status !== 'aberta')
        throw new Error('Rodada não encontrada ou comanda fechada.');
      if (round.status === 'entregue')
        throw new Error('Esta rodada já foi entregue.');
      round.readyAt ??= new Date().toISOString();
      saveData(data);
    },

    async deliverRound(commandId, roundId) {
      const data = readData();

      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );

      if (!command) {
        throw new Error('Comanda não encontrada.');
      }
      if (command.status !== 'aberta') throw new Error('Comanda fechada.');

      const round = command.rounds.find((item) => item.id === roundId);

      if (!round) {
        throw new Error('Rodada não encontrada.');
      }

      if (round.status === 'entregue') return round;

      round.status = 'entregue';
      round.deliveredAt = new Date().toISOString();

      round.items.forEach((item) => {
        item.status = 'entregue';
      });

      saveData(data);

      return round;
    },

    async saveTasting(commandId, tasting) {
      const data = readData();

      const command = data.commands.find(
        (item) => item.id === Number(commandId),
      );

      if (!command) {
        throw new Error('Comanda não encontrada.');
      }
      if (command.status !== 'aberta') throw new Error('Comanda fechada.');

      command.tasting = {
        beverage: tasting.beverage,
        servingTime: tasting.servingTime,
      };

      saveData(data);

      return command.tasting;
    },
  };
  const mutations = new Set([
    'createOrder',
    'deliverRound',
    'saveTasting',
    'callWaiter',
    'attendCall',
    'markRoundReady',
  ]);
  return Object.fromEntries(
    Object.entries(api).map(([name, action]) => [
      name,
      mutations.has(name)
        ? (...args) => withStateLock(store(), () => action(...args))
        : action,
    ]),
  );
}

export const ordersApi = remoteEnabled ? remoteOrders : createOrdersApi();

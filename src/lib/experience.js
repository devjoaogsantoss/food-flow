export const experienceLabels = ['Reserva', 'Chegada', 'Sua mesa', 'Pedidos', 'Cozinha', 'Entrega', 'Pagamento', 'Saída'];

export function receptionProgress(command) {
  if (command?.status === 'fechada') return 'Conta quitada';
  if (command?.calls?.some(call => call.status === 'pendente')) return 'Aguardando garçom';
  if (command?.rounds?.some(round => round.readyAt && round.status !== 'entregue')) return 'Aguardando entrega';
  if (command?.diningAt && command.rounds?.every(round => round.status === 'entregue')) return 'Em refeição';
  if (command?.rounds?.length) return 'Já pediu';
  return 'Realizando pedido';
}

export function experienceStage(reservation, command) {
  if (reservation?.status === 'encerrada') return 7;
  if (command?.status === 'fechada') return 6;
  if (command?.rounds?.length) {
    return command.rounds.some(round => round.status !== 'entregue' && !round.readyAt) ? 4 : 5;
  }
  if (reservation?.status === 'acomodada' || command) return 3;
  if (['chegou', 'em_espera', 'mesa_definida'].includes(reservation?.status)) return 2;
  return 1;
}

export function kitchenTableState(table, commands) {
  const command = commands.find(item => item.id === table.commandId);
  if (!command) return { key: 'free', label: 'Sem ocupação', command: null };
  if (command.status === 'fechada') return { key: 'delivered', label: 'Conta quitada · aguardando saída', command };
  if (!command.rounds.length) return { key: 'waiting', label: 'Aguardando pedido', command };
  if (command.rounds.some(round => round.status !== 'entregue')) return { key: 'preparing', label: 'Em preparo / aguardando entrega', command };
  return { key: 'delivered', label: 'Pedidos entregues', command };
}

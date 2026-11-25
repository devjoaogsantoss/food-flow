export const PARKING_CENTS = 790;
export function calculateBill(command) {
  let aLaCarteCents = 0,
    tastingCents = 0;
  for (const round of command.rounds ?? []) {
    for (const item of round.items ?? []) {
      const cents = item.priceCents ?? Math.round(item.price * 100);
      const total = cents * item.quantity;
      if (item.kind === 'degustacao') tastingCents += total;
      else aLaCarteCents += total;
    }
  }
  const serviceCents = Math.round(aLaCarteCents * 0.1);
  const couvertCents = Math.round(aLaCarteCents * 0.1);
  // Estacionamento é único por mesa. Mantido separado, inclusive no menu degustação.
  const parkingCents = command.parkingRequired === true ? PARKING_CENTS : 0;
  const totalCents =
    aLaCarteCents + tastingCents + serviceCents + couvertCents + parkingCents;
  return {
    aLaCarteCents,
    tastingCents,
    serviceCents,
    couvertCents,
    parkingCents,
    totalCents,
    hasPendingRounds: (command.rounds ?? []).some(
      (round) => round.status !== 'entregue',
    ),
    parkingPending: command.parkingRequired == null,
  };
}

// Prévia financeira: nenhum crédito é aplicado ou pagamento registrado aqui.
export function checkoutSummary(command) {
  const bill = calculateBill(command);
  const creditCents = command.reservationPayment?.status === 'aprovado'
    ? command.reservationPayment.amountCents : 0;
  const hasConsumption = bill.aLaCarteCents + bill.tastingCents > 0;
  const balanceCents = bill.totalCents - creditCents;
  const manualRequired = hasConsumption && balanceCents < 0;
  const hasPendingItems = (command.rounds ?? []).some(round =>
    round.items?.some(item => item.status !== 'entregue'));
  const blocked = command.status !== 'aberta' || bill.hasPendingRounds || hasPendingItems || bill.parkingPending;
  return {
    ...bill, creditCents, balanceCents, hasConsumption, manualRequired,
    dueCents: Math.max(0, balanceCents),
    differenceCents: Math.max(0, -balanceCents),
    canPayDigital: !blocked && hasConsumption && !manualRequired,
    canCloseInPerson: !blocked && !manualRequired,
    hasPendingItems,
  };
}

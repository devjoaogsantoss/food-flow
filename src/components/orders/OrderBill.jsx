import { calculateBill } from '../../lib/billing.js';
import { money } from '../../lib/menu.js';
export default function OrderBill({ command }) {
  const bill = calculateBill(command);
  const rows = [
    ['Produtos à la carte', bill.aLaCarteCents],
    ['Menus degustação', bill.tastingCents],
    ['Serviço · 10% do à la carte', bill.serviceCents],
    ['Couvert · 10% do à la carte', bill.couvertCents],
    ['Estacionamento · uma vez por mesa', bill.parkingCents],
  ];
  return (
    <section
      className="order-bill"
      aria-label="Resumo da comanda"
    >
      <h2>Resumo da mesa</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
        <div className="bill-total">
          <dt>Total de consumo e adicionais</dt>
          <dd>{money(bill.totalCents)}</dd>
        </div>
      </dl>
      {bill.parkingPending && (
        <p role="status">
          A recepção ainda precisa informar se a mesa utiliza estacionamento.
        </p>
      )}
      <p>
        {bill.hasPendingRounds
          ? 'Há rodadas em preparo ou aguardando entrega.'
          : command.rounds?.length ? 'Todas as rodadas enviadas foram entregues.' : 'Nenhum pedido enviado.'}
      </p>
      <small>
        {command.reservationPayment?.status === 'aprovado'
          ? `Reserva paga (simulada): ${money(command.reservationPayment.amountCents)}. Crédito registrado para o módulo de fechamento; ainda não abatido neste resumo.`
          : 'Resumo demonstrativo. Esta comanda não possui crédito de reserva registrado.'}
        {' '}Pagamento e fechamento dependem do módulo de conta.
      </small>
    </section>
  );
}

import { checkoutSummary } from '../../lib/billing.js';
import { money } from '../../lib/menu.js';
export default function OrderBill({ command }) {
  const bill = checkoutSummary(command);
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
      <dl>
        <div><dt>Crédito da reserva</dt><dd>{money(bill.creditCents)}</dd></div>
        <div><dt>Saldo a pagar</dt><dd>{money(command.settlement ? 0 : bill.dueCents)}</dd></div>
        {bill.manualRequired && <div><dt>Diferença a tratar presencialmente</dt><dd>{money(bill.differenceCents)}</dd></div>}
      </dl>
      {bill.manualRequired && <p role="status">Consumo inferior ao crédito da reserva. Fechamento digital bloqueado; solicite atendimento presencial. O destino da diferença depende de aprovação da equipe, sem estorno ou retenção automáticos.</p>}
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
      {command.settlement ? <p role="status">
        {command.settlement.status === 'sem_consumo' ? 'Encerrada sem consumo. Taxa da reserva retida.' : 'Pagamento simulado aprovado. Comanda quitada.'}
        {' '}Crédito aplicado: {money(command.settlement.appliedCreditCents)}.
        {' '}Valor pago no fechamento: {money(command.settlement.amountCents)}.
        {' '}Referência: {command.settlement.reference}.
      </p> : <small>Prévia: o crédito será aplicado uma única vez na confirmação do fechamento. Pagamentos são simulados.</small>}
    </section>
  );
}

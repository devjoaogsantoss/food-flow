import { useState } from 'react';
import { checkoutSummary } from '../../lib/billing.js';
import { checkoutApi } from '../../services/checkoutApi.js';

export default function CheckoutControls({ command, profile, onClosed }) {
  const bill = checkoutSummary(command);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('');
  if (command.status !== 'aberta') return null;
  const inPerson = profile === 'garcom';
  const allowed = inPerson ? bill.canCloseInPerson : bill.canPayDigital;
  const selectedMethod = !bill.hasConsumption ? 'sem_consumo' : bill.dueCents === 0 ? 'credito' : method;
  async function submit(paymentStatus) {
    setBusy(true); setError('');
    try {
      await checkoutApi.close(command.id, {
        method: selectedMethod, paymentStatus,
        expectedTotalCents: bill.totalCents, expectedCreditCents: bill.creditCents,
      }, { role: profile, principal: profile === 'cliente' ? command.reservationId : 'garcom-demo' });
      await onClosed();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="order-draft" aria-label="Fechamento da comanda">
    <h3>{inPerson ? 'Fechamento presencial' : 'Pagamento digital'}</h3>
    {bill.hasPendingRounds || bill.hasPendingItems ? <p role="status">Pagamento bloqueado até a entrega de todos os itens.</p> : null}
    {!bill.hasConsumption && <p>Sem consumo: a equipe pode encerrar a visita, retendo a taxa da reserva e sem nova cobrança.</p>}
    {bill.hasConsumption && bill.dueCents === 0 && !bill.manualRequired && <p>O crédito cobre exatamente a conta. Confirme a quitação sem nova cobrança.</p>}
    {bill.hasConsumption && bill.dueCents > 0 && <label>
      Forma de pagamento simulado
      <select value={method} onChange={event => setMethod(event.target.value)} disabled={busy}>
        <option value="">Selecione</option>
        {inPerson ? <>
          <option value="dinheiro">Dinheiro</option>
          <option value="cartao_presencial">Cartão presencial</option>
          <option value="dividido">Pagamento dividido — total conferido pela equipe</option>
        </> : <>
          <option value="pix">Pix</option>
          <option value="cartao_credito">Cartão de crédito</option>
        </>}
      </select>
    </label>}
    <button className="menu-action" disabled={!allowed || busy || !selectedMethod} onClick={() => submit('aprovado')}>
      {busy ? 'Processando…' : !bill.hasConsumption ? 'Encerrar sem consumo' : bill.dueCents === 0 ? 'Quitar com crédito da reserva' : 'Simular pagamento aprovado e fechar'}
    </button>
    {bill.dueCents > 0 && <button className="menu-action" disabled={!allowed || busy || !selectedMethod} onClick={() => submit('recusado')}>Simular pagamento recusado</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

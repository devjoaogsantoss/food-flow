import { useCallback, useEffect, useRef, useState } from 'react';
import ProductShell, { clientLink } from '../components/ProductShell.jsx';
import CustomerAccess from '../components/CustomerAccess.jsx';
import ExperienceTimeline from '../components/ExperienceTimeline.jsx';
import OrderComposer from '../components/orders/OrderComposer.jsx';
import OrderRounds from '../components/orders/OrderRounds.jsx';
import OrderBill from '../components/orders/OrderBill.jsx';
import CheckoutControls from '../components/orders/CheckoutControls.jsx';
import { receptionApi } from '../services/receptionApi.js';
import { ordersApi } from '../services/ordersApi.js';
import { subscribeState } from '../services/localStore.js';
import { getCustomerProfile, getCustomerReservations, hasCustomerSession, linkCustomerReservation, logoutCustomer } from '../services/remoteApi.js';
import { checkoutSummary } from '../lib/billing.js';
import { money } from '../lib/menu.js';
import '../styles/orders.css';

export default function ClientPage() {
  const explicit = new URLSearchParams(window.location.search).get('reserva');
  const [code, setCode] = useState(() => explicit ?? '');
  const [reservation, setReservation] = useState(null);
  const [command, setCommand] = useState(null);
  const [account, setAccount] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const gate = useRef(false);
  const path = window.location.pathname.split('/').at(-1);
  const view = ['pedidos', 'acompanhar', 'conta'].includes(path) ? path : 'visita';
  const titles = { visita: 'Meu Perfil', pedidos: 'Realize seu pedido', acompanhar: 'Acompanhe seus pedidos', conta: 'Minha conta' };
  const load = useCallback(async () => {
    if (!code.trim()) return;
    try {
      const guest = await receptionApi.getGuestStatus(code.trim().toUpperCase());
      if (!guest) throw new Error('Reserva não encontrada. Confira o link ou código completo.');
      const check = guest.canViewCommand ? await ordersApi.getCommand(guest.commandId) : null;
      setReservation(guest); setCommand(check); setError('');
    } catch (failure) { setError(failure.message); }
  }, [code]);
  const loadAccount = useCallback(async () => {
    if (!hasCustomerSession()) return;
    const [profile, reservations] = await Promise.all([getCustomerProfile(), getCustomerReservations()]);
    setAccount(profile); setHistory(reservations);
  }, []);
  useEffect(() => { load(); return subscribeState(load); }, [load]);
  useEffect(() => { loadAccount().catch(failure => setError(failure.message)); }, [loadAccount]);
  async function run(action, message) {
    if (gate.current) return false;
    gate.current = true; setBusy(true); setError('');
    try { await action(); await load(); setFeedback(message); return true; }
    catch (failure) { setError(failure.message); return false; }
    finally { gate.current = false; setBusy(false); }
  }
  const bill = command ? checkoutSummary(command) : null;
  const link = destination => clientLink(destination, reservation?.id ?? code);
  async function signInComplete() { await loadAccount(); setError(''); }
  async function signOut() {
    try { await logoutCustomer(); setAccount(null); setHistory([]); setFeedback('Você saiu da sua conta.'); }
    catch (failure) { setError(failure.message); }
  }
  async function linkExistingReservation(event) {
    event.preventDefault(); setBusy(true); setError(''); setFeedback('');
    try { await linkCustomerReservation(code.trim()); setCode(''); await loadAccount(); setFeedback('Reserva vinculada ao seu histórico.'); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function lookupByCode(event) {
    event.preventDefault();
    if (code.trim()) window.location.assign(clientLink('visita', code.trim()));
  }
  return <ProductShell title={titles[view]} description={view === 'visita' ? 'Reserva, pedidos e comanda em um só lugar.' : undefined} code={reservation?.id ?? code} active="perfil">
    {!reservation && view === 'visita' && <>
      {account ? <section className="product-surface product-customer-profile">
        <div className="product-section-head"><div><h2>Olá, {account.firstName}</h2><p>{account.email} · {account.phone}</p></div><button className="product-button secondary" onClick={signOut}>Sair da conta</button></div>
        <h3>Minhas reservas</h3>
        {!history.length ? <p>Ainda não há reservas vinculadas a esta conta.</p> : <div className="client-reservation-history">{history.map(item => <article className="client-history-card" key={item.id}><div><strong>{item.date.split('-').reverse().join('/')} · {item.service}</strong><span>{item.guestName} · {item.partySize} pessoas · {item.status}</span></div><a className="product-button secondary" href={clientLink('visita', item.id)}>Ver visita</a></article>)}</div>}
        <a className="product-button" href="/cliente/reservar">Realizar nova reserva</a>
        <details className="client-link-reservation"><summary>Vincular uma reserva existente</summary><p>Informe o código da reserva para incluir essa experiência no histórico da conta.</p><form onSubmit={linkExistingReservation}><label htmlFor="link-reservation-code">Código da reserva</label><input id="link-reservation-code" value={code} onChange={event => setCode(event.target.value)} placeholder="FF-…" required/><button className="product-button" disabled={busy}>{busy ? 'Vinculando…' : 'Vincular ao histórico'}</button></form></details>
      </section> : <CustomerAccess onAuthenticated={signInComplete} error={error} setError={setError}/>}
      {!account && <section className="product-surface product-code-lookup"><h2>Acessar com código</h2><p>Use o código recebido na confirmação. Não é necessário criar uma conta.</p><form onSubmit={lookupByCode}><label htmlFor="guest-reservation-code">Código da reserva</label><input id="guest-reservation-code" value={code} onChange={event => setCode(event.target.value)} placeholder="FF-…" required/><button className="product-button">Acessar visita</button></form></section>}
    </>}
    {error && <p className="product-alert" role="alert">{error}</p>}{feedback && <p className="product-notice" role="status">{feedback}</p>}
    {reservation && <>
      <nav className="product-subnav" aria-label="Sua visita">{[['visita','Minha visita'],['pedidos','Fazer pedido'],['acompanhar','Acompanhar'],['conta','Minha conta']].map(([key,label]) => <a key={key} href={link(key)} aria-current={view === key ? 'page' : undefined}>{label}</a>)}</nav>
      {view === 'visita' && <>
        <section className="product-surface"><div className="product-section-head"><div><span className="product-badge">{reservation.title}</span><h2>Olá, {reservation.guestName}</h2></div><span>{reservation.table ? `Mesa ${reservation.table.number}` : reservation.assignedTableId ? `Mesa ${reservation.assignedTableId} definida` : 'Esperamos por você'}</span></div><p>{reservation.date.split('-').reverse().join('/')} · {reservation.service} · {reservation.partySize} pessoas</p><p>{reservation.message}</p><ExperienceTimeline reservation={reservation} command={command} /></section>
        <div className="product-card-grid">
          <section className="product-surface"><h2>Peça à mesa</h2><p>{reservation.canOrder ? 'Monte a próxima rodada pelo cardápio.' : 'O pedido libera após o garçom confirmar a acomodação.'}</p>{reservation.canOrder ? <a className="product-button" href={link('pedidos')}>Montar pedido</a> : <a className="product-button secondary" href="/cliente/cardapio">Ver cardápio</a>}</section>
          <section className="product-surface"><h2>Pedidos da mesa</h2><p>{command?.rounds.length ? `${command.rounds.length} rodada(s) enviada(s).` : 'As rodadas aparecerão aqui após o envio.'}</p><a className="product-button secondary" href={link('acompanhar')}>Ver preparo</a></section>
          <section className="product-surface"><h2>Pagamento</h2><p>{command?.status === 'fechada' ? 'Procure a recepção para registrar a saída.' : bill ? `Saldo atual: ${money(bill.dueCents)}. O crédito está no resumo da conta.` : 'O consumo será reunido na comanda após a acomodação.'}</p><a className="product-button secondary" href={link('conta')}>Abrir comanda</a></section>
        </div>
        {reservation.canOrder && <section className="product-help"><div><h2>Prefere atendimento à mesa?</h2><p>O garçom pode ajudar com o pedido ou com sua conta.</p></div><button className="product-button secondary" disabled={busy} onClick={() => run(() => ordersApi.callWaiter(command.id), 'Garçom chamado. Aguarde o atendimento.')}>Chamar garçom</button></section>}
        <details className="visit-access-details"><summary>Dados e acesso da reserva</summary><p>Código: {reservation.id}</p><p>Guarde-o para abrir esta visita sem uma conta.</p><a href={link('reservar')}>Gerenciar ou fazer outra reserva</a></details>
      </>}
      {view === 'pedidos' && <section className="product-surface">{reservation.canOrder && command ? <OrderComposer key={command.id} onSend={async (items, options) => {
        const sent = await run(() => ordersApi.createOrder(command.id, items, 'cliente', options), 'Pedido enviado.');
        if (sent) window.location.assign(link('acompanhar'));
        return sent;
      }} loading={busy} maxPeople={reservation.partySize} isWaiter={false} /> : <><h2>Pedidos indisponíveis nesta etapa</h2><p>{reservation.message}</p><a className="product-button secondary" href={link('visita')}>Voltar à minha visita</a></>}</section>}
      {view === 'acompanhar' && <section className="product-surface"><p className="product-caption">As atualizações da cozinha e do garçom aparecem automaticamente.</p><OrderRounds command={command} isWaiter={false} />{reservation.canOrder && <button className="product-button secondary" disabled={busy} onClick={() => run(() => ordersApi.callWaiter(command.id), 'Garçom chamado. Aguarde o atendimento.')}>Chamar garçom</button>}</section>}
      {view === 'conta' && <section className="product-surface">{command ? <>
        {command.status === 'fechada' && <p className="product-notice" role="status">{reservation.status === 'encerrada' ? 'Visita encerrada. Obrigado pela visita!' : 'Próximo passo: procure a recepção para registrar a saída.'}</p>}
        <OrderBill command={command} /><CheckoutControls key={command.id} command={command} profile="cliente" onClosed={load} />
        {command.status === 'aberta' && <button className="product-button secondary" disabled={busy} onClick={() => run(() => ordersApi.callWaiter(command.id, 'fechamento_presencial'), 'Ajuda com pagamento solicitada. Aguarde o garçom.')}>Pedir ajuda com pagamento</button>}
      </> : <><h2>Reserva confirmada</h2><p>O pagamento simulado da reserva já foi aprovado. Consumo, estacionamento e crédito aparecerão após a abertura da comanda.</p></>}</section>}
    </>}
  </ProductShell>;
}

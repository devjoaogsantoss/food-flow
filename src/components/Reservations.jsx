import { useEffect, useRef, useState } from 'react';
import { SectionHeading } from './Layout.jsx';
import { localDateString, serviceTimes, tableCategories, reservationFees, validateResponsible } from '../lib/reservations.js';
import { reservationsApi as api } from '../services/reservationsApi.js';
import { subscribeState } from '../services/localStore.js';
import { remoteEnabled, loginGuest } from '../services/remoteApi.js';
import { money } from '../lib/menu.js';
import '../styles/reservations.css';

const LAST = 'food-flow-last-reservation';
function remember(code) {
  try { if (code) localStorage.setItem(LAST, code); else localStorage.removeItem(LAST); } catch { /* registro principal já salvo */ }
}
const dateLabel = value => value.split('-').reverse().join('/');
export default function Reservations() {
  const [choice, setChoice] = useState({ date: '', service: serviceTimes[0], tableCategory: 2 });
  const [contact, setContact] = useState({ guestName: '', whatsapp: '', email: '', partySize: 2 });
  const [step, setStep] = useState('escolha');
  const [availability, setAvailability] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [lookupPassword, setLookupPassword] = useState('');
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => {
    let active = true;
    async function restore() {
      let saved;
      try { saved = localStorage.getItem(LAST); } catch { return; }
      if (!saved) return;
      try {
        const found = await api.getReservation(saved);
        if (active) { setReservation(found); setStep('resumo'); }
      } catch (failure) {
        if (failure.code === 'NOT_FOUND') remember(null);
        else if (active) setError(failure.message);
      }
    }
    restore();
    const off = subscribeState(restore);
    return () => { active = false; off(); };
  }, []);
  async function run(action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (failure) { setError(failure.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function update(field, value) {
    setChoice(current => ({ ...current, [field]: value }));
    if (field === 'tableCategory') setContact(current => ({ ...current, partySize: Number(value) }));
    setAvailability(null); setError('');
  }
  async function check(selected = choice) {
    await run(async () => {
      const result = await api.getAvailability(selected);
      setAvailability(result);
      if (result.available) setStep('dados');
    });
  }
  async function pay(status) {
    await run(async () => {
      try {
        const saved = await api.confirm({ ...choice, ...contact, ...(remoteEnabled ? { password } : {}), paymentStatus: status });
        remember(saved.id); setReservation(saved); setStep('resumo');
      } catch (failure) {
        if (failure.code === 'CONFLICT') { setStep('escolha'); setAvailability(await api.getAvailability(choice)); }
        throw failure;
      }
    });
  }
  function reset() {
    remember(null); setReservation(null); setStep('escolha'); setAvailability(null);
    setContact({ guestName: '', whatsapp: '', email: '', partySize: Number(choice.tableCategory) });
    setError(''); setNotice(''); setConfirmCancel(false);
  }
  const waiting = step === 'espera';
  return (
    <section id="reservas" className="reservation-section section">
      <div className="container reservation-grid">
        <div>
          <SectionHeading eyebrow="UM LUGAR À SUA ESPERA" title="Planeje seu próximo encontro.">
            De terça a sábado, às 17h45, 20h00 e 22h15.
          </SectionHeading>
          <p>Reserve uma mesa para 2, 4 ou 8 pessoas. A confirmação depende de disponibilidade e pagamento simulado aprovado.</p>
          <p>Taxa por mesa: 2 lugares · R$ 50; 4 lugares · R$ 100; 8 lugares · R$ 200.</p>
          <p>Cancelamentos com pelo menos 12 horas de antecedência permitem reembolso simulado.</p>
          <p className="small-note">{remoteEnabled ? 'Reserva salva no servidor. Guarde o código e a senha para consultar em outro dispositivo. Pagamento simulado, sem cobrança real.' : 'Demonstração salva neste navegador. Não há cobrança real. Use dados fictícios.'}</p>
          <a href="/minha-reserva">Acompanhar chegada e acomodação</a>
        </div>
        <div className="reservation-form reservas">
          <h3>Sua visita ao Santo Garfo</h3>
          {error && <p className="reservas-error" role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          {step === 'escolha' && <>
            <form onSubmit={e => { e.preventDefault(); check(); }}>
              <label htmlFor="visit-date">Data da visita</label>
              <input id="visit-date" type="date" required min={localDateString()} value={choice.date} onChange={e => update('date', e.target.value)} />
              <label htmlFor="reservation-service">Horário do serviço</label>
              <select id="reservation-service" value={choice.service} onChange={e => update('service', e.target.value)}>
                {serviceTimes.map(time => <option key={time}>{time}</option>)}
              </select>
              <label htmlFor="table-category">Categoria de mesa</label>
              <select id="table-category" value={choice.tableCategory} onChange={e => update('tableCategory', Number(e.target.value))}>
                {tableCategories.map(size => <option key={size} value={size}>Mesa para {size} pessoas · {money(reservationFees[size])}</option>)}
              </select>
              <button className="button" disabled={busy}>{busy ? 'Consultando…' : 'Ver disponibilidade'}</button>
            </form>
            {availability && !availability.available && <div role="status">
              <p>Não há vagas neste serviço e categoria.</p>
              <div className="reservas-actions">{availability.suggestions.map(date => <button key={date} type="button" disabled={busy} onClick={() => { const next = { ...choice, date }; setChoice(next); check(next); }}>{dateLabel(date)}</button>)}</div>
              <button type="button" disabled={busy} onClick={() => setStep('espera')}>Entrar na lista de espera gratuita</button>
              <p>A lista não reserva mesa nem garante vaga.</p>
            </div>}
            <form className="reservas-lookup" onSubmit={e => { e.preventDefault(); run(async () => { if (remoteEnabled) await loginGuest(code, lookupPassword); const found = await api.getReservation(code); remember(found.id); setReservation(found); setStep('resumo'); }); }}>
              <label htmlFor="reservation-code">Já tem reserva? Consulte pelo código</label>
              <input id="reservation-code" required value={code} onChange={e => setCode(e.target.value)} />
              {remoteEnabled && <label>Senha da reserva<input type="password" autoComplete="current-password" value={lookupPassword} onChange={e => setLookupPassword(e.target.value)} /></label>}
              <button disabled={busy}>Consultar reserva</button>
            </form>
          </>}
          {['dados', 'espera'].includes(step) && <form onSubmit={e => {
            e.preventDefault();
            const invalid = validateResponsible(contact);
            if (invalid) { setError(invalid); return; }
            if (!waiting) { setError(''); setStep('pagamento'); }
            else run(async () => { await api.joinWaitlist({ ...choice, ...contact }); setStep('escolha'); setNotice('Inscrição registrada. A recepção poderá entrar em contato. Não há cobrança nem garantia de vaga.'); });
          }}>
            <p>{dateLabel(choice.date)} · {choice.service} · Mesa de {choice.tableCategory} lugares</p>
            {waiting && <h4>Lista de espera gratuita</h4>}
            {[['guestName', 'Nome completo', 'text'], ['whatsapp', 'WhatsApp', 'tel'], ['email', 'E-mail', 'email']].map(([field, label, type]) =>
              <label key={field}>{label}<input name={field} type={type} required value={contact[field]} onChange={e => setContact(current => ({ ...current, [field]: e.target.value }))} /></label>)}
            {!waiting && remoteEnabled && <label>Crie uma senha para consultar a reserva<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>}
            {!waiting && <label>Quantidade de pessoas<input name="partySize" type="number" min="1" max={choice.tableCategory} required value={contact.partySize} onChange={e => setContact(current => ({ ...current, partySize: Number(e.target.value) }))} /></label>}
            <div className="reservas-actions"><button type="button" disabled={busy} onClick={() => { setStep('escolha'); setError(''); }}>Voltar</button><button disabled={busy}>{waiting ? 'Confirmar inscrição gratuita' : 'Continuar para pagamento'}</button></div>
          </form>}
          {step === 'pagamento' && <>
            <p>{dateLabel(choice.date)} · {choice.service} · {contact.partySize} pessoas · Mesa de {choice.tableCategory} lugares</p>
            <h4>Pagamento simulado · {money(reservationFees[choice.tableCategory])}</h4>
            <p>Nenhuma cobrança real será feita.</p>
            <div className="reservas-actions"><button disabled={busy} onClick={() => pay('aprovado')}>Simular aprovação</button><button disabled={busy} onClick={() => pay('recusado')}>Simular recusa</button><button disabled={busy} onClick={() => setStep('dados')}>Voltar</button></div>
          </>}
          {step === 'resumo' && reservation && <>
            <h4>{reservation.status === 'cancelada' ? 'Reserva cancelada' : 'Sua reserva'}</h4>
            <p className="reservas-code">Código: <strong>{reservation.id}</strong></p>
            <p>{reservation.guestName} · {dateLabel(reservation.date)} · {reservation.service}</p>
            <p>{reservation.partySize} pessoas · Mesa de {reservation.tableCategory} lugares</p>
            <p>Pagamento simulado: {reservation.payment ? money(reservation.payment.amountCents) : 'Registro demonstrativo sem pagamento'}</p>
            {reservation.refund && <p role="status">{reservation.refund.eligible ? 'Reembolso simulado: ' + money(reservation.refund.amountCents) + '.' : 'Cancelamento com menos de 12 horas: sem reembolso.'}</p>}
            <a href={'/minha-reserva?reserva=' + encodeURIComponent(reservation.id)}>Acompanhar minha reserva</a>
            {reservation.status === 'reservada' && (!confirmCancel ? <button disabled={busy} onClick={() => setConfirmCancel(true)}>Cancelar reserva</button> : <div><p>Confirmar cancelamento desta reserva?</p><button disabled={busy} onClick={() => run(async () => { setReservation(await api.cancel(reservation.id)); setConfirmCancel(false); })}>Confirmar cancelamento</button><button disabled={busy} onClick={() => setConfirmCancel(false)}>Manter reserva</button></div>)}
            <button disabled={busy} onClick={reset}>Nova reserva</button>
          </>}
        </div>
      </div>
    </section>
  );
}

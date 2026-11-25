import { useEffect, useRef, useState } from 'react';
import { SectionHeading } from './Layout.jsx';
import { localDateString, serviceTimes, tableCategories, reservationFees, validateResponsible } from '../lib/reservations.js';
import { reservationsApi as api } from '../services/reservationsApi.js';
import { remoteEnabled } from '../services/remoteApi.js';
import { money } from '../lib/menu.js';
import '../styles/reservations.css';

const dateLabel = value => value.split('-').reverse().join('/');
export default function Reservations({ initialCode } = {}) {
  const [choice, setChoice] = useState({ date: '', service: serviceTimes[0], tableCategory: 2 });
  const [contact, setContact] = useState({ guestName: '', whatsapp: '', email: '', partySize: 2 });
  const [step, setStep] = useState('escolha');
  const [availability, setAvailability] = useState(null);
  const [reservation, setReservation] = useState(null);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => {
    let active = true;
    if (initialCode) api.getReservation(initialCode).then(found => {
      if (active) { setReservation(found); setStep('resumo'); }
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [initialCode]);
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
        const saved = await api.confirm({ ...choice, ...contact, paymentStatus: status });
        setReservation(saved); setStep('resumo');
      } catch (failure) {
        if (failure.code === 'CONFLICT') { setStep('escolha'); setAvailability(await api.getAvailability(choice)); }
        throw failure;
      }
    });
  }
  function reset() {
    setReservation(null); setStep('escolha'); setAvailability(null);
    setContact({ guestName: '', whatsapp: '', email: '', partySize: Number(choice.tableCategory) });
    setError(''); setNotice(''); setConfirmCancel(false);
  }
  return (
    <section id="reservas" className="reservation-section section">
      <div className="container reservation-grid">
        <div>
          <SectionHeading eyebrow="RESERVA" title="Valores e condições">
            De terça a sábado, às 17h45, 20h00 e 22h15.
          </SectionHeading>
          <p>O valor da reserva depende do tamanho da mesa e vira crédito para consumo: 2 lugares · R$ 50; 4 lugares · R$ 100; 8 lugares · R$ 200.</p>
          <p>Cancelamentos feitos com pelo menos 12 horas de antecedência têm reembolso simulado.</p>
          <p className="small-note">{remoteEnabled ? 'Guarde o código completo para consultar a reserva em outro dispositivo. A confirmação de pagamento é simulada, sem cobrança.' : 'Demonstração neste navegador, sem cobrança. Use dados fictícios.'}</p>
          <a href="/minha-reserva">Já reservou? Acompanhe sua visita</a>
        </div>
        <div className="reservation-form reservas">
          <h3>Dados da reserva</h3>
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
              <label htmlFor="reservation-party-size">Quantidade de pessoas</label>
              <select id="reservation-party-size" value={contact.partySize} onChange={event => { const size=Number(event.target.value); setContact(current=>({...current,partySize:size})); setChoice(current=>({...current,tableCategory:tableCategories.find(capacity=>capacity>=size)})); setAvailability(null); }}>
                {Array.from({length:8},(_,i)=>i+1).map(size => <option key={size} value={size}>{size} {size===1?'pessoa':'pessoas'}</option>)}
              </select>
              <p className="small-note">Mesa de {choice.tableCategory} lugares · reserva de {money(reservationFees[choice.tableCategory])}, convertida em crédito.</p>
              <button className="button" disabled={busy}>{busy ? 'Consultando…' : 'Ver disponibilidade'}</button>
            </form>
            {availability && !availability.available && <div role="status">
              <p>Não há vagas neste serviço e categoria.</p>
              <div className="reservas-actions">{availability.suggestions.map(date => <button key={date} type="button" disabled={busy} onClick={() => { const next = { ...choice, date }; setChoice(next); check(next); }}>{dateLabel(date)}</button>)}</div>
              <p>Escolha outro horário, data ou categoria de mesa.</p>
            </div>}
          </>}
          {step === 'dados' && <form onSubmit={e => {
            e.preventDefault();
            const invalid = validateResponsible(contact);
            if (invalid) { setError(invalid); return; }
            setError(''); setStep('pagamento');
          }}>
            <p>{dateLabel(choice.date)} · {choice.service} · Mesa de {choice.tableCategory} lugares</p>
            {[['guestName', 'Nome completo', 'text'], ['whatsapp', 'WhatsApp', 'tel'], ['email', 'E-mail', 'email']].map(([field, label, type]) =>
              <label key={field}>{label}<input name={field} type={type} required value={contact[field]} onChange={e => setContact(current => ({ ...current, [field]: e.target.value }))} /></label>)}
            <p>{contact.partySize} pessoas. Para alterar o grupo, volte à escolha da reserva.</p>
            <div className="reservas-actions"><button type="button" disabled={busy} onClick={() => { setStep('escolha'); setError(''); }}>Voltar</button><button disabled={busy}>Continuar para pagamento</button></div>
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

import { useCallback, useEffect, useRef, useState } from 'react';
import StaffAccess from '../components/StaffAccess.jsx';
import ProductShell, { clientLink } from '../components/ProductShell.jsx';
import Modal from '../components/Modal.jsx';
import TableIcon from '../components/TableIcon.jsx';
import ReceptionOperations from '../components/reception/ReceptionOperations.jsx';
import { localDateString, serviceTimes } from '../lib/reservations.js';
import { tableStatusLabels } from '../lib/reception.js';
import { receptionProgress } from '../lib/experience.js';
import { receptionApi } from '../services/receptionApi.js';
import { subscribeState } from '../services/localStore.js';

export default function ReceptionPage() { return <StaffAccess requiredRole="recepcao"><Reception /></StaffAccess>; }

function Reception() {
  const [date, setDate] = useState(new URLSearchParams(location.search).get('data') ?? localDateString());
  const [service, setService] = useState(serviceTimes[0]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('chegadas');
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [operations, setOperations] = useState({ barSeats: [] });
  const [progress, setProgress] = useState([]);
  const [picker, setPicker] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [parking, setParking] = useState({});
  const [filter, setFilter] = useState('Todos');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const gate = useRef(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const load = useCallback(async () => {
    try {
      const [list, tableList, ops, checks] = await Promise.all([receptionApi.getReservations({ date, service, query }), receptionApi.getTables(), receptionApi.getOperations(), receptionApi.getProgress()]);
      setReservations(list); setTables(tableList); setOperations(ops); setProgress(checks); setError('');
    } catch (failure) { setError(failure.message); }
  }, [date, service, query]);
  useEffect(() => { load(); return subscribeState(load); }, [load]);
  async function run(action, message) {
    if (gate.current) return false;
    gate.current = true; setBusy(true); setError('');
    try { await action(); await load(); setFeedback(message); return true; }
    catch (failure) { setError(failure.message); return false; }
    finally { gate.current = false; setBusy(false); }
  }
  const check = reservation => progress.find(command => command.id === reservation.commandId);
  const arrivals = reservations.filter(item => ['reservada','chegou','em_espera','mesa_definida'].includes(item.status));
  const seated = reservations.filter(item => item.status === 'acomodada');
  const departures = seated.filter(item => check(item)?.status === 'fechada');
  const filtered = seated.filter(item => filter === 'Todos' || receptionProgress(check(item)) === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);
  const active = reservations.find(item => item.id === detail);
  const labels = ['Todos','Realizando pedido','Já pediu','Aguardando garçom','Aguardando entrega','Em refeição','Conta quitada'];
  return <ProductShell area="recepcao" title="Recepção" description="Reservas, mesas e disponibilidade do bar.">
    {view !== 'mapa' && <div className="product-metrics"><div><strong>{arrivals.length}</strong><span>Chegadas previstas e presentes</span></div><div><strong>{seated.length}</strong><span>Grupos acomodados</span></div><div><strong>{tables.filter(table => table.status === 'pronta').length}/{tables.length}</strong><span>Mesas prontas no salão</span></div><div><strong>{20 - (operations.barSeats?.length ?? 0)}/20</strong><span>Lugares livres no bar</span></div></div>}
    {view !== 'mapa' && <section className="product-filters" aria-label="Filtros da recepção"><label>Dia<input id="rc-date" type="date" value={date} onChange={event => { setDate(event.target.value); setPage(0); }} /></label><label>Serviço<select id="rc-service" value={service} onChange={event => setService(event.target.value)}>{serviceTimes.map(time => <option key={time}>{time}</option>)}<option value="todos">Todos os serviços</option></select></label><label>Nome ou código<input id="rc-query" type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Buscar reserva" /></label></section>}
    {error && <p className="product-alert" role="alert">{error}</p>}{feedback && <p className="product-notice" role="status">{feedback}</p>}
    <nav className="product-subnav" aria-label="Tarefas da recepção">{[['chegadas','Chegadas',arrivals.length],['acomodados','Acomodados',seated.length],['saidas','Saídas',departures.length],['mapa','Salão e bar',null],['historico','Histórico',null]].map(([key,label,count]) => <button key={key} aria-pressed={view === key} onClick={() => { setView(key); setFeedback(''); }}>{label}{count != null && <span>{count}</span>}</button>)}</nav>
    {view === 'chegadas' && <section><div className="product-section-head"><h2>Reservas do dia</h2><span>Defina a mesa; o salão confirma a acomodação.</span></div>
      {!arrivals.length && <p className="product-empty">Nenhuma chegada para este filtro.</p>}
      <div className="product-card-grid">{arrivals.map(reservation => <article className="product-surface" key={reservation.id} data-reservation={reservation.id}>
        <span className="product-badge">{reservation.status === 'reservada' ? 'Reserva confirmada' : reservation.status === 'mesa_definida' ? 'Aguardando garçom / metre' : 'Chegada registrada'}</span><h3>{reservation.guestName}</h3><p>{reservation.service} · {reservation.partySize} pessoas · mesa de {reservation.tableCategory} lugares</p>
        {reservation.status === 'reservada' ? <><label htmlFor={'parking-' + reservation.id}>Usará estacionamento?<select id={'parking-' + reservation.id} value={parking[reservation.id] ?? ''} onChange={event => setParking(values => ({...values,[reservation.id]:event.target.value}))}><option value="">Informe antes do check-in</option><option value="sim">Sim · R$ 7,90 por mesa</option><option value="nao">Não</option></select></label><button className="product-button" disabled={busy || !parking[reservation.id]} onClick={() => run(() => receptionApi.registerArrival(reservation.id,'recepcao',parking[reservation.id] === 'sim'),'Chegada registrada. Defina uma mesa para o salão.')}>Registrar chegada</button></> : <>
          {reservation.assignedTableId && <p><strong>Mesa {reservation.assignedTableId} selecionada.</strong></p>}
          <button className="product-button secondary" data-table-picker={reservation.id} disabled={busy} onClick={() => { setChosen(null); setPicker(reservation); }}>{reservation.assignedTableId ? 'Trocar mesa definida' : 'Definir mesa'}</button>
          <button className="product-link" onClick={() => { setView('mapa'); setFeedback('Confira os lugares livres no bar. A ocupação é registrada por lugar.'); }}>Oferecer lugar no bar</button>
        </>}
        <a className="product-link" href={clientLink('visita',reservation.id)} target="_blank" rel="noreferrer">Abrir como cliente ↗</a>
      </article>)}</div>
    </section>}
    {view === 'acomodados' && <section><h2>Andamento das mesas</h2><div className="product-subnav" aria-label="Filtrar status">{labels.map(label => <button key={label} aria-pressed={filter === label} onClick={() => { setFilter(label); setPage(0); }}>{label}</button>)}</div><div className="product-table-grid">{filtered.slice(current*8,current*8+8).map(reservation => <button className="product-table-card" key={reservation.id} onClick={() => setDetail(reservation.id)}><TableIcon capacity={reservation.tableCategory} /><strong>Mesa {reservation.tableId}</strong><span>{reservation.guestName}</span><small>{receptionProgress(check(reservation))}</small></button>)}</div>{!filtered.length && <p className="product-empty">Nenhuma mesa neste status.</p>}{pages > 1 && <div className="product-pagination"><button disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button><span>{current + 1} de {pages}</span><button disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Próxima</button></div>}</section>}
    {view === 'saidas' && <section><h2>Saídas para registrar</h2><p>Depois do check-out, o salão recebe a mesa para limpeza.</p><div className="product-card-grid">{departures.map(reservation => <article className="product-surface" key={reservation.id}><span className="product-badge">Conta quitada</span><h3>Mesa {reservation.tableId} · {reservation.guestName}</h3><button className="product-button" disabled={busy} onClick={() => run(() => receptionApi.registerDeparture(reservation.id,'recepcao'),'Saída registrada. Salão avisado para limpeza.')}>Registrar saída</button></article>)}</div>{!departures.length && <p className="product-empty">Nenhuma saída pendente de confirmação.</p>}</section>}
    {view === 'mapa' && <div className="product-floor"><section className="product-surface"><h2>Salão</h2><p>A limpeza e a liberação das mesas são registradas pelo salão.</p><div className="product-table-grid compact">{tables.map(table => <div className={'product-table-card state-' + table.status} key={table.id}><TableIcon capacity={table.capacity} /><strong>Mesa {table.number}</strong><small>{table.capacity} lugares · {tableStatusLabels[table.status]}</small></div>)}</div></section><ReceptionOperations operations={operations} busy={busy} onBar={(id,occupied) => run(() => receptionApi.setBarSeat(id,occupied,'recepcao'),'Ocupação do bar atualizada.')} /></div>}
    {view === 'historico' && <section className="product-surface"><h2>Visitas encerradas e canceladas</h2>{reservations.filter(item => ['encerrada','cancelada'].includes(item.status)).map(item => <div className="product-list-row" key={item.id}><span>{item.guestName} · {item.service}</span><span>{item.status === 'encerrada' ? 'Visita encerrada' : 'Reserva cancelada'}</span><a href={clientLink('visita',item.id)} target="_blank" rel="noreferrer">Ver visita ↗</a></div>)}</section>}
    {picker && <Modal title={`Definir mesa · ${picker.partySize} pessoas`} onClose={() => setPicker(null)}><p>Esta escolha encaminha o grupo ao salão. A comanda abre quando o garçom confirmar a acomodação.</p><div className="product-table-grid">{tables.filter(table => table.capacity === picker.tableCategory).map(table => <button key={table.id} data-table-choice={table.id} className={'product-table-card state-' + table.status} aria-pressed={chosen === table.id} disabled={table.status !== 'pronta'} onClick={() => setChosen(table.id)}><TableIcon capacity={table.capacity} /><strong>Mesa {table.number}</strong><small>{tableStatusLabels[table.status]}</small></button>)}</div><div className="product-dialog-actions"><button className="product-button secondary" onClick={() => setPicker(null)}>Cancelar</button><button className="product-button" disabled={!chosen || busy} onClick={async () => { if(await run(() => receptionApi.assignTable(picker.id,chosen,'recepcao'),'Mesa definida. Salão avisado para acomodação.')) setPicker(null); }}>Definir mesa e chamar salão</button></div></Modal>}
    {active && <Modal title={`Mesa ${active.tableId} · ${receptionProgress(check(active))}`} onClose={() => setDetail(null)}><h3>{active.guestName}</h3><p>{active.partySize} pessoas · {active.service}</p><label>Estacionamento<select disabled={busy || check(active)?.status === 'fechada'} value={active.parkingRequired ? 'sim' : 'nao'} onChange={event => run(() => receptionApi.updateParking(active.id,event.target.value === 'sim','recepcao'),'Estacionamento atualizado.')}><option value="sim">Sim · R$ 7,90</option><option value="nao">Não</option></select></label><a className="product-button secondary" href={clientLink('visita',active.id)} target="_blank" rel="noreferrer">Abrir experiência do cliente ↗</a></Modal>}
  </ProductShell>;
}

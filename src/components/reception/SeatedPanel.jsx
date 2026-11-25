import { useState } from 'react';
import Modal from '../Modal.jsx';
import TableIcon from '../TableIcon.jsx';
import ReservationCard from './ReservationCard.jsx';
import { receptionProgress } from '../../lib/experience.js';

export default function SeatedPanel({ reservations, progress, ...props }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('Todos');
  const [page, setPage] = useState(0);
  const options = ['Todos', 'Realizando pedido', 'Já pediu', 'Aguardando garçom', 'Aguardando entrega', 'Conta quitada'];
  const status = reservation => receptionProgress(progress.find(command => command.id === reservation.commandId));
  const filtered = reservations.filter(reservation => filter === 'Todos' || status(reservation) === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);
  const active = reservations.find(reservation => reservation.id === selected);
  return <section className="rc-tables" aria-label="Status dos acomodados">
    <h2>Acomodados <small>{reservations.length} grupos</small></h2>
    <div className="flow-tabs" aria-label="Filtrar atendimento">{options.map(option => <button key={option} aria-pressed={filter === option} onClick={() => { setFilter(option); setPage(0); }}>{option}</button>)}</div>
    {!filtered.length && <p>Nenhuma mesa neste status.</p>}
    <div className="rc-seated-grid">{filtered.slice(current * 8, current * 8 + 8).map(reservation => <button key={reservation.id} className="rc-seated-card" onClick={() => setSelected(reservation.id)}>
      <TableIcon capacity={reservation.tableCategory} /><strong>Mesa {reservation.tableId}</strong>
      <span>{reservation.guestName}</span><small>{status(reservation)}</small>
    </button>)}</div>
    {pages > 1 && <div className="flow-dialog-actions"><button disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button><span>Página {current + 1} de {pages}</span><button disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Próxima</button></div>}
    {active && <Modal title={`Mesa ${active.tableId} · ${status(active)}`} onClose={() => setSelected(null)}><ReservationCard reservation={active} {...props} /></Modal>}
  </section>;
}

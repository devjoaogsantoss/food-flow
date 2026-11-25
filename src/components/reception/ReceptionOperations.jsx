export default function ReceptionOperations({ operations, busy, onBar }) {
  const seats = operations.barSeats ?? Array.from({ length: operations.barOccupancy ?? 0 }, (_, i) => i + 1);
  return <section className="rc-bar" aria-label="Disponibilidade do bar">
    <h2>Bar <small>{20 - seats.length} livres · {seats.length} ocupados</small></h2>
    <p>Selecione um lugar para atualizar o status.</p>
    <div className="rc-bar-grid">{Array.from({ length: 20 }, (_, index) => {
      const id = index + 1, occupied = seats.includes(id);
      return <button key={id} className={'rc-bar-seat ' + (occupied ? 'is-occupied' : '')} disabled={busy}
        aria-pressed={occupied} aria-label={'Bar ' + id + ', ' + (occupied ? 'ocupado' : 'livre')}
        onClick={() => onBar(id, !occupied)}>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M11 8h26v17H11zM15 25l-4 17m22-17 4 17M13 35h22M24 25v17" /></svg>
        <strong>{id}</strong><small>{occupied ? 'Ocupado' : 'Livre'}</small>
      </button>;
    })}</div>
  </section>;
}

import { useState } from 'react';
import Modal from '../Modal.jsx';
import TableIcon from '../TableIcon.jsx';
import {
  arrivalDelayMinutes,
  reservationStatusLabels,
  tableStatusLabels,
  tablesForCategory,
} from '../../lib/reception.js';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReservationCard({
  reservation,
  tables,
  isReception,
  busy,
  onArrival,
  onWait,
  onSeat,
  onDeparture,
  onParking,
}) {
  const [chosenTable, setChosenTable] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTable, setDraftTable] = useState('');
  const [parking, setParking] = useState('');
  const options = tablesForCategory(tables, reservation.tableCategory);
  const waitingTable = tables.find(
    (table) => table.id === reservation.waitingTableId,
  );
  const seatedTable = tables.find((table) => table.id === reservation.tableId);
  const selected = options.find((table) => table.id === Number(chosenTable));
  const draftSelection = options.find(table => table.id === Number(draftTable));
  const delayMinutes = arrivalDelayMinutes(reservation);

  return (
    <article className="rc-card">
      <header className="rc-card-head">
        <div>
          <h3>{reservation.guestName}</h3>
          <p className="rc-meta">
            {reservation.id} · {reservation.service.replace(':', 'h')} ·{' '}
            {reservation.partySize} pessoas
          </p>
        </div>
        <span className={'rc-tag rc-tag-' + reservation.status}>
          {reservationStatusLabels[reservation.status]}
        </span>
      </header>

      {delayMinutes > 0 && <p role="status">Serviço iniciado há {delayMinutes} min; chegada ainda não registrada. Confirme a situação com o responsável.</p>}
      {reservation.status === 'reservada' && (
        <div className="rc-actions">
          {isReception ? (
            <>
              <label htmlFor={'parking-' + reservation.id}>
                Precisa de estacionamento?
              </label>
              <select
                id={'parking-' + reservation.id}
                required
                value={parking}
                onChange={(event) => setParking(event.target.value)}
              >
                <option value="">Selecione antes do check-in</option>
                <option value="sim">Sim · R$ 7,90 por mesa</option>
                <option value="nao">Não</option>
              </select>
              <button
                type="button"
                className="rc-btn"
                disabled={busy || !parking}
                onClick={() => onArrival(reservation.id, parking === 'sim')}
              >
                Registrar chegada
              </button>
            </>
          ) : (
            <p className="rc-hint">Somente a recepção registra a chegada.</p>
          )}
        </div>
      )}
      {isReception &&
        !['reservada', 'encerrada', 'cancelada'].includes(reservation.status) && (
          <label htmlFor={'parking-edit-' + reservation.id}>
            Estacionamento
            <select
              id={'parking-edit-' + reservation.id}
              value={
                reservation.parkingRequired == null
                  ? ''
                  : reservation.parkingRequired
                    ? 'sim'
                    : 'nao'
              }
              disabled={busy}
              onChange={(event) => {
                if (event.target.value)
                  onParking(reservation.id, event.target.value === 'sim');
              }}
            >
              <option value="">Ainda não informado</option>
              <option value="sim">Sim · R$ 7,90 por mesa</option>
              <option value="nao">Não</option>
            </select>
          </label>
        )}

      {reservation.status === 'chegou' && (
        <div className="rc-actions">
          <p className="rc-meta">
            Chegou às {formatTime(reservation.arrivedAt)}.
          </p>
          {isReception ? (
            <>
              <button type="button" className="rc-btn rc-btn-secondary flow-picker-trigger"
                data-table-picker={reservation.id} aria-haspopup="dialog" disabled={busy}
                onClick={() => { setDraftTable(chosenTable); setPickerOpen(true); }}>
                <TableIcon capacity={reservation.tableCategory} />
                {selected ? `Mesa ${selected.number} · ${tableStatusLabels[selected.status]}` : 'Selecionar mesa'}
              </button>
              {pickerOpen && <Modal title={`Escolha uma mesa · ${reservation.tableCategory} lugares`} onClose={() => setPickerOpen(false)}>
                <p>Selecione uma mesa pronta para acomodar o grupo.</p>
                {!options.length && <p>Nenhuma mesa disponível nesta categoria.</p>}
                <div className="flow-table-grid">
                  {options.map(table => <button key={table.id} type="button"
                    data-table-choice={table.id}
                    className={`flow-table-option ${table.status === 'aguardando_limpeza' ? 'is-cleaning' : table.status !== 'pronta' ? 'is-unavailable' : ''}`}
                    aria-pressed={Number(draftTable) === table.id}
                    aria-label={`Mesa ${table.number}, ${table.capacity} lugares, ${tableStatusLabels[table.status]}`}
                    disabled={busy || table.status !== 'pronta'} onClick={() => setDraftTable(String(table.id))}>
                    <TableIcon capacity={table.capacity} /><strong>Mesa {table.number}</strong>
                    <small>{table.capacity} lugares</small><small>{tableStatusLabels[table.status]}</small>
                  </button>)}
                </div>
                <div className="flow-dialog-actions">
                  <button type="button" className="rc-btn rc-btn-secondary" onClick={() => setPickerOpen(false)}>Cancelar</button>
                  <button type="button" className="rc-btn" disabled={!draftSelection || draftSelection.status !== 'pronta' || busy} onClick={() => { setChosenTable(draftTable); setPickerOpen(false); }}>Usar mesa selecionada</button>
                </div>
              </Modal>}
              {selected?.status === 'pronta' ? (
                <button
                  type="button"
                  className="rc-btn"
                  disabled={busy}
                  onClick={() => onSeat(reservation.id, selected.id)}
                >
                  Confirmar acomodação
                </button>
              ) : <p className="rc-hint">Escolha uma mesa pronta para continuar.</p>}
            </>
          ) : (
            <p className="rc-hint">Somente a recepção acomoda o grupo.</p>
          )}
        </div>
      )}

      {reservation.status === 'em_espera' && (
        <div className="rc-actions">
          <p className="rc-meta">
            Aguardando a mesa {waitingTable?.number} desde{' '}
            {formatTime(reservation.waitingSince)}. O responsável já vê o aviso.
          </p>
          {isReception && (
            <button
              type="button"
              className="rc-btn"
              disabled={busy || waitingTable?.status !== 'pronta'}
              onClick={() => onSeat(reservation.id, waitingTable.id)}
            >
              Confirmar acomodação
            </button>
          )}
          {waitingTable?.status !== 'pronta' && (
            <p className="rc-hint">
              A acomodação libera quando a mesa estiver pronta.
            </p>
          )}
        </div>
      )}

      {reservation.status === 'acomodada' && (
        <div className="rc-actions">
          <p className="rc-meta">
            Mesa {seatedTable?.number} · Comanda #{reservation.commandId} ·
            acomodada às {formatTime(reservation.seatedAt)}.
          </p>
          <a href={'/minha-reserva?reserva=' + encodeURIComponent(reservation.id)} target="_blank" rel="noreferrer">Abrir experiência do cliente ↗</a>
          {isReception && (
            <button
              type="button"
              className="rc-btn rc-btn-secondary"
              disabled={busy}
              onClick={() => onDeparture(reservation.id)}
            >
              Registrar saída após fechamento
            </button>
          )}
          <p className="rc-hint">
            A saída exige comanda fechada pelo módulo de conta.
          </p>
        </div>
      )}
      {reservation.status === 'encerrada' && (
        <p>Saída registrada às {formatTime(reservation.departedAt)}.</p>
      )}
    </article>
  );
}

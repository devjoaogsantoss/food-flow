import { useState } from 'react';
import {
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
  const [parking, setParking] = useState('');
  const options = tablesForCategory(tables, reservation.tableCategory);
  const waitingTable = tables.find(
    (table) => table.id === reservation.waitingTableId,
  );
  const seatedTable = tables.find((table) => table.id === reservation.tableId);
  const selected = options.find((table) => table.id === Number(chosenTable));
  const selectId = 'table-' + reservation.id;

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
              <label htmlFor={selectId}>
                Mesa para {reservation.tableCategory} lugares
              </label>
              <select
                id={selectId}
                value={chosenTable}
                onChange={(event) => setChosenTable(event.target.value)}
              >
                <option value="">Selecione a mesa</option>
                {options.map((table) => (
                  <option
                    key={table.id}
                    value={table.id}
                  >
                    Mesa {table.number} — {tableStatusLabels[table.status]}
                  </option>
                ))}
              </select>
              {selected?.status === 'pronta' ? (
                <button
                  type="button"
                  className="rc-btn"
                  disabled={busy}
                  onClick={() => onSeat(reservation.id, selected.id)}
                >
                  Confirmar acomodação
                </button>
              ) : (
                <button
                  type="button"
                  className="rc-btn rc-btn-secondary"
                  disabled={busy || !selected}
                  onClick={() => onWait(reservation.id, selected.id)}
                >
                  Registrar espera
                </button>
              )}
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
          <a href="/pedidos">Consultar comandas</a>
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

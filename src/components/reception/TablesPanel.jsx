import { tableStatusLabels } from '../../lib/reception.js';
import { useState } from 'react';
import TableIcon from '../TableIcon.jsx';
import Modal from '../Modal.jsx';

export default function TablesPanel({ tables, isReception, busy, onReady }) {
  const [selected, setSelected] = useState(null);
  const active = tables.find(table => table.id === selected);
  return (
    <section
      className="rc-tables"
      aria-labelledby="rc-tables-title"
    >
      <h2 id="rc-tables-title">Mesas</h2>
      <ul className="rc-table-list">
        {tables.map((table) => (
          <li
            key={table.id}
            className={'rc-table rc-table-' + table.status}
          >
            <button className="rc-map-table" onClick={() => setSelected(table.id)} aria-label={`Mesa ${table.number}, ${tableStatusLabels[table.status]}`}>
              <TableIcon capacity={table.capacity} /><strong>Mesa {table.number}</strong>
              <small>{table.capacity} lugares · {tableStatusLabels[table.status]}</small>
            </button>
          </li>
        ))}
      </ul>
      {active && <Modal title={`Mesa ${active.number}`} onClose={() => setSelected(null)}>
        <p>{active.capacity} lugares · {tableStatusLabels[active.status]}</p>
            {isReception && active.status === 'aguardando_limpeza' && (
              <button
                type="button"
                className="rc-btn rc-btn-small"
                disabled={busy}
                onClick={() => onReady(active.id)}
              >
                Marcar como pronta
              </button>
            )}
      </Modal>}
    </section>
  );
}

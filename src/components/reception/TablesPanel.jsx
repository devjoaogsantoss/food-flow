import { tableStatusLabels } from '../../lib/reception.js';

export default function TablesPanel({ tables, isReception, busy, onReady }) {
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
            <strong>Mesa {table.number}</strong>
            <span>{table.capacity} lugares</span>
            <span>{tableStatusLabels[table.status]}</span>
            {isReception && table.status === 'aguardando_limpeza' && (
              <button
                type="button"
                className="rc-btn rc-btn-small"
                disabled={busy}
                onClick={() => onReady(table.id)}
              >
                Marcar como pronta
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

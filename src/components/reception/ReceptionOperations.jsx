import { useState } from 'react';
import { serviceTimes } from '../../lib/reservations.js';

export default function ReceptionOperations({
  operations,
  date,
  service,
  isReception,
  busy,
  onBar,
  onAdd,
  onStatus,
}) {
  const [bar, setBar] = useState('');
  return (
    <section
      className="rc-tables"
      aria-label="Espera e bar"
    >
      <h2>Bar</h2>
      <p>
        {operations.barOccupancy} de 20 lugares ocupados. Controle informativo
        da equipe; pedidos ficam com o barman.
      </p>
      {isReception && (
        <form
          className="rc-guest-form"
          onSubmit={(event) => {
            event.preventDefault();
            onBar(bar);
          }}
        >
          <label htmlFor="rc-bar">Quantidade de pessoas no bar</label>
          <input
            id="rc-bar"
            type="number"
            min="0"
            max="20"
            required
            value={bar}
            onChange={(event) => setBar(event.target.value)}
          />
          <button
            className="rc-btn"
            disabled={busy}
          >
            Atualizar ocupação
          </button>
        </form>
      )}
      <h2>Lista de espera por lotação</h2>
      <p>
        Inscrição gratuita, sem garantia de vaga e sem bloquear mesa. Separada
        da espera de quem já tem reserva.
      </p>
      {isReception && (
        <form
          className="rc-guest-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <label htmlFor="wl-name">Nome fictício</label>
          <input
            id="wl-name"
            name="guestName"
            required
          />
          <label htmlFor="wl-category">Categoria</label>
          <select
            id="wl-category"
            name="tableCategory"
            required
          >
            {[2, 4, 8].map((value) => (
              <option
                key={value}
                value={value}
              >
                {value} pessoas
              </option>
            ))}
          </select>
          <label htmlFor="wl-date">Data</label>
          <input
            id="wl-date"
            type="date"
            name="date"
            defaultValue={date}
            required
          />
          <label htmlFor="wl-service">Serviço</label>
          <select
            id="wl-service"
            name="service"
            defaultValue={
              serviceTimes.includes(service) ? service : serviceTimes[0]
            }
          >
            {serviceTimes.map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>
          <label htmlFor="wl-phone">WhatsApp fictício</label>
          <input
            id="wl-phone"
            name="whatsapp"
            type="tel"
            required
          />
          <label htmlFor="wl-email">E-mail fictício</label>
          <input
            id="wl-email"
            name="email"
            type="email"
            required
          />
          <button
            className="rc-btn"
            disabled={busy}
          >
            Registrar na espera
          </button>
        </form>
      )}
      <ul className="rc-table-list">
        {operations.waitlist
          .filter(
            (entry) =>
              entry.date === date &&
              (service === 'todos' || entry.service === service),
          )
          .map((entry) => (
            <li
              key={entry.id}
              className="rc-table"
            >
              <strong>{entry.guestName}</strong>
              <span>
                {entry.service} · {entry.tableCategory} pessoas · {entry.status}
              </span>
              {isReception && (
                <>
                  <span>
                    {entry.whatsapp} · {entry.email}
                  </span>
                  <label htmlFor={'wl-' + entry.id}>Situação</label>
                  <select
                    id={'wl-' + entry.id}
                    disabled={busy}
                    value={entry.status}
                    onChange={(event) => onStatus(entry.id, event.target.value)}
                  >
                    <option value="aguardando">Aguardando</option>
                    <option value="contatado">Contatado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}

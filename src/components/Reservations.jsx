import { useState } from 'react';
import Icon from './Icon.jsx';
import { SectionHeading } from './Layout.jsx';
import {
  localDateString,
  validateDate,
  serviceTimes,
  tableCategories,
} from '../lib/reservations.js';
export default function Reservations() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [table, setTable] = useState('');
  const error = validateDate(date);
  const ready = date && !error && time && table;
  return (
    <section
      id="reservas"
      className="reservation-section section"
    >
      <div className="container reservation-grid">
        <div>
          <SectionHeading
            eyebrow="UM LUGAR À SUA ESPERA"
            title="Planeje seu próximo encontro."
          >
            Escolha o momento e a companhia. O resto começa à mesa.
          </SectionHeading>
          <div className="service-note">
            <Icon name="clock" />
            <div>
              <strong>De terça a sábado</strong>
              <p>Três serviços: 17h45, 20h00 e 22h15.</p>
              <p>Domingo e segunda, sem reservas.</p>
            </div>
          </div>
          <p className="small-note">
            A disponibilidade das mesas será consultada quando o serviço de
            reservas estiver conectado.
          </p>
        </div>
        <div className="reservation-form">
          <div className="form-top">
            <h3>Sua visita ao Santo Garfo</h3>
            <span className="badge">Prévia</span>
          </div>
          <p className="form-intro">Explore as opções de reserva.</p>
          <label htmlFor="visit-date">
            01 <span>Data da visita</span>
          </label>
          <input
            id="visit-date"
            type="date"
            value={date}
            min={localDateString()}
            aria-describedby="date-message"
            aria-invalid={Boolean(date && error)}
            onChange={(event) => {
              setDate(event.target.value);
              setTime('');
            }}
          />
          <p
            id="date-message"
            className={date && error ? 'field-message error' : 'field-message'}
            aria-live="polite"
          >
            {error ||
              'Data válida para a demonstração. Disponibilidade não consultada.'}
          </p>
          <fieldset disabled={!date || Boolean(error)}>
            <legend>
              02 <span>Horário do serviço</span>
            </legend>
            <div className="time-options">
              {serviceTimes.map((item) => (
                <label
                  key={item}
                  className="time-option"
                >
                  <input
                    type="radio"
                    name="service"
                    value={item}
                    checked={time === item}
                    onChange={() => setTime(item)}
                  />
                  <span>{item.replace(':', 'h')}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="table-category">
            03 <span>Categoria de mesa</span>
          </label>
          <select
            id="table-category"
            value={table}
            onChange={(event) => setTable(event.target.value)}
          >
            <option value="">Selecione a categoria</option>
            {tableCategories.map((number) => (
              <option
                key={number}
                value={number}
              >
                Mesa para {number} pessoas
              </option>
            ))}
          </select>
          <div
            className="demo-notice"
            role="status"
          >
            <Icon
              name="calendar"
              size={20}
            />
            <p>
              {ready
                ? 'Opções selecionadas para demonstração. Nenhuma mesa foi reservada.'
                : 'Prévia demonstrativa. As reservas ainda não estão conectadas e nenhuma mesa será reservada.'}
            </p>
          </div>
          <button
            className="button unavailable"
            disabled
          >
            Reservas em breve
            <Icon
              name="arrow"
              size={18}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

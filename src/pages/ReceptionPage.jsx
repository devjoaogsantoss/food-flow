import { useCallback, useEffect, useRef, useState } from 'react';
import Brand from '../components/Brand.jsx';
import StaffAccess from '../components/StaffAccess.jsx';
import ReservationCard from '../components/reception/ReservationCard.jsx';
import TablesPanel from '../components/reception/TablesPanel.jsx';
import { localDateString, serviceTimes } from '../lib/reservations.js';
import {
  ALL_SERVICES,
  RECEPTION_ROLE,
  groupReservations,
} from '../lib/reception.js';
import { receptionApi } from '../services/receptionApi.js';
import { subscribeState } from '../services/localStore.js';
import ReceptionOperations from '../components/reception/ReceptionOperations.jsx';
import '../styles/reception.css';

const columns = [
  {
    key: 'reserved',
    title: 'Com reserva',
    empty: 'Ninguém aguardando chegada.',
  },
  { key: 'arrived', title: 'Chegaram', empty: 'Ninguém na recepção agora.' },
  { key: 'seated', title: 'Acomodados', empty: 'Nenhum grupo acomodado.' },
];

export default function ReceptionPage() {
  return (
    <StaffAccess requiredRole="recepcao">
      <ReceptionWorkspace />
    </StaffAccess>
  );
}

function ReceptionWorkspace() {
  const [date, setDate] = useState(localDateString());
  const [service, setService] = useState(serviceTimes[0]);
  const [query, setQuery] = useState('');
  const role = RECEPTION_ROLE;
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [operations, setOperations] = useState({
    waitlist: [],
    barOccupancy: 0,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [list, tableList, operationalData] = await Promise.all([
        receptionApi.getReservations({ date, service, query }),
        receptionApi.getTables(),
        receptionApi.getOperations(),
      ]);
      setReservations(list);
      setTables(tableList);
      setOperations(operationalData);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
      setReservations([]);
      setTables([]);
    }
  }, [date, service, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Outra aba (a do responsável) também grava no mesmo armazenamento.
  useEffect(() => {
    return subscribeState(load);
  }, [load]);

  // Trava o clique repetido antes mesmo de o React redesenhar a tela.
  async function run(action, successText) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await action();
      setFeedback({
        type: 'ok',
        text: result.changed === false ? 'Já estava registrado.' : successText,
      });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const groups = groupReservations(reservations);
  const isReception = role === RECEPTION_ROLE;

  return (
    <>
      <header className="rc-topbar">
        <a
          href="/"
          aria-label="Food Flow — voltar ao início"
        >
          <Brand />
        </a>
        <span>Recepção · Santo Garfo</span>
        <nav aria-label="Módulos">
          <a href="/equipe">Minha área da equipe</a>
        </nav>
      </header>
      <main className="rc-page">
        <h1>Recepção</h1>
        <p className="rc-lead">
          Registre a chegada, a espera e a acomodação. A comanda só abre quando
          o grupo é acomodado.
        </p>
        <p>
          Protótipo local com reservas fictícias. Perfil demonstrativo, sem
          autenticação. Não use dados pessoais reais.
        </p>

        <section
          className="rc-filters"
          aria-label="Filtros"
        >
          <div>
            <label htmlFor="rc-date">Dia</label>
            <input
              id="rc-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rc-service">Serviço</label>
            <select
              id="rc-service"
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              {serviceTimes.map((time) => (
                <option
                  key={time}
                  value={time}
                >
                  {time.replace(':', 'h')}
                </option>
              ))}
              <option value={ALL_SERVICES}>Todos os serviços</option>
            </select>
          </div>
          <div className="rc-search">
            <label htmlFor="rc-query">Buscar por nome ou código</label>
            <input
              id="rc-query"
              type="search"
              placeholder="Ex.: Ana ou FF-0001"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </section>
        {query.trim() && (
          <p className="rc-hint">
            Com texto na busca, procuramos no dia inteiro, em todos os serviços.
          </p>
        )}

        <p
          className={
            'rc-feedback ' + (feedback.type ? 'rc-' + feedback.type : '')
          }
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </p>

        <div className="rc-columns">
          {columns.map((column) => (
            <section
              key={column.key}
              className="rc-column"
              aria-labelledby={'rc-col-' + column.key}
            >
              <h2 id={'rc-col-' + column.key}>
                {column.title} <span>{groups[column.key].length}</span>
              </h2>
              {groups[column.key].length === 0 && (
                <p className="rc-empty">{column.empty}</p>
              )}
              {groups[column.key].map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  tables={tables}
                  isReception={isReception}
                  busy={busy}
                  onArrival={(id, parking) =>
                    run(
                      () => receptionApi.registerArrival(id, role, parking),
                      'Chegada registrada.',
                    )
                  }
                  onParking={(id, parking) =>
                    run(
                      () => receptionApi.updateParking(id, parking, role),
                      'Estacionamento atualizado.',
                    )
                  }
                  onWait={(id, tableId) =>
                    run(
                      () => receptionApi.registerWait(id, tableId, role),
                      'Espera registrada. O responsável já vê o aviso.',
                    )
                  }
                  onSeat={(id, tableId) =>
                    run(
                      () => receptionApi.confirmSeating(id, tableId, role),
                      'Acomodação confirmada e comanda aberta.',
                    )
                  }
                  onDeparture={(id) =>
                    run(
                      () => receptionApi.registerDeparture(id, role),
                      'Saída registrada. Mesa aguardando limpeza.',
                    )
                  }
                />
              ))}
            </section>
          ))}
        </div>

        <TablesPanel
          tables={tables}
          isReception={isReception}
          busy={busy}
          onReady={(tableId) =>
            run(
              () => receptionApi.markTableReady(tableId, role),
              'Mesa marcada como pronta.',
            )
          }
        />
        <ReceptionOperations
          operations={operations}
          date={date}
          service={service}
          isReception={isReception}
          busy={busy}
          onBar={(value) =>
            run(
              () => receptionApi.setBarOccupancy(value, role),
              'Ocupação do bar atualizada.',
            )
          }
          onAdd={(entry) =>
            run(
              () => receptionApi.addWaitlistEntry(entry, role),
              'Inscrição registrada, sem garantia de vaga.',
            )
          }
          onStatus={(id, status) =>
            run(
              () => receptionApi.updateWaitlistEntry(id, status, role),
              'Lista de espera atualizada.',
            )
          }
        />
      </main>
    </>
  );
}

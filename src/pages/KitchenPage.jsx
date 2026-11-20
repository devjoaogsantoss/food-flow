import { useCallback, useEffect, useState } from 'react';
import StaffAccess from '../components/StaffAccess.jsx';
import { ordersApi } from '../services/ordersApi.js';
import { subscribeState } from '../services/localStore.js';
import '../styles/orders.css';
function Kitchen() {
  const [commands, setCommands] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setCommands(await ordersApi.getCommands());
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);
  useEffect(() => {
    load();
    return subscribeState(load);
  }, [load]);
  const pending = commands
    .filter((command) => command.status === 'aberta')
    .flatMap((command) =>
      command.rounds
        .filter((round) => round.status !== 'entregue')
        .map((round) => ({ command, round })),
    );
  return (
    <main className="orders-page">
      <a href="/">Site do cliente</a>
      <h1>Cozinha</h1>
      <p>
        Fila de preparo por mesa. A confirmação da entrega fica com o garçom.
      </p>
      {error && <p role="alert">{error}</p>}
      {!pending.length && <p>Nenhuma rodada aguardando preparo.</p>}
      {pending.map(({ command, round }) => (
        <article
          className="round-card"
          key={round.id}
        >
          <h2>
            Mesa {command.tableId} · Rodada {round.number}
          </h2>
          <p>{round.readyAt ? 'Pronto para servir' : 'Em preparo'}</p>
          <ul>
            {round.items.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.quantity} × {item.name}
                </strong>
                {item.beverage && (
                  <p>
                    Bebida: {item.beverage.name}
                    {item.servingTime && ' · ' + item.servingTime}
                  </p>
                )}
                {item.courses && (
                  <ul>
                    {item.courses.map((course) => (
                      <li key={course.id}>
                        {course.category}: {course.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {round.notes && <p>Observações: {round.notes}</p>}
          <button
            className="menu-action"
            disabled={Boolean(round.readyAt)}
            onClick={async () => {
              try {
                await ordersApi.markRoundReady(command.id, round.id);
              } catch (failure) {
                setError(failure.message);
              }
            }}
          >
            {round.readyAt
              ? 'Aguardando o garçom'
              : 'Marcar pronto para servir'}
          </button>
        </article>
      ))}
    </main>
  );
}
export default function KitchenPage() {
  return (
    <StaffAccess requiredRole="cozinha">
      <Kitchen />
    </StaffAccess>
  );
}

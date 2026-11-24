import { useCallback, useEffect, useState } from 'react';
import { subscribeState } from '../services/localStore.js';
import { receptionApi } from '../services/receptionApi.js';

import OrderComposer from '../components/orders/OrderComposer';
import OrderRounds from '../components/orders/OrderRounds';
import OrderBill from '../components/orders/OrderBill.jsx';
import StaffAccess from '../components/StaffAccess.jsx';

import { ordersApi } from '../services/ordersApi';

import '../styles/orders.css';

export default function OrdersPage() {
  return new URLSearchParams(window.location.search).get('reserva') ? (
    <OrdersWorkspace />
  ) : (
    <StaffAccess requiredRole="garcom">
      <OrdersWorkspace />
    </StaffAccess>
  );
}

function OrdersWorkspace() {
  const reservationId =
    new URLSearchParams(window.location.search)
      .get('reserva')
      ?.trim()
      .toUpperCase() ?? '';
  const [tables, setTables] = useState([]);
  const [commands, setCommands] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState(null);

  const profile = reservationId ? 'cliente' : 'garcom';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [feedback, setFeedback] = useState('');

  const loadData = useCallback(async () => {
    try {
      const tableData = await ordersApi.getTables();
      let commandData = await ordersApi.getCommands();
      if (profile === 'cliente') {
        const guest = reservationId
          ? await receptionApi.getGuestStatus(reservationId)
          : null;
        commandData = guest?.canViewCommand
          ? commandData.filter(
              (command) =>
                command.id === guest.commandId &&
                command.reservationId === reservationId,
            )
          : [];
      }

      setTables(
        tableData.filter((table) =>
          commandData.some((command) => command.id === table.commandId),
        ),
      );
      setCommands(commandData);
      setSelectedCommand(
        (previous) =>
          commandData.find(
            (command) =>
              command.id === previous?.id,
          ) ?? (profile === 'cliente' ? (commandData[0] ?? null) : null),
      );
      setError('');
    } catch (failure) {
      setError(failure.message);
      setTables([]);
      setCommands([]);
      setSelectedCommand(null);
    }
  }, [profile, reservationId]);

  useEffect(() => {
    loadData();
    return subscribeState(loadData);
  }, [loadData]);

  async function openCommand(commandId) {
    try {
      const command = await ordersApi.getCommand(commandId);
      setSelectedCommand(command);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function sendOrder(items, options) {
    if (!selectedCommand) {
      setError('Selecione uma comanda primeiro.');
      return false;
    }

    try {
      setLoading(true);

      await ordersApi.createOrder(selectedCommand.id, items, profile, options);

      await loadData();

      setFeedback('Pedido enviado com sucesso!');
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function deliverRound(roundId) {
    try {
      await ordersApi.deliverRound(selectedCommand.id, roundId);

      await loadData();

      setFeedback('Entrega da rodada confirmada!');
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <main className="orders-page">
      <header className="orders-title">
        <a
          href="/"
          className="orders-back-link"
        >
          Voltar ao início
        </a>
        <nav aria-label="Módulos">
          {profile === 'cliente' ? (
            <a href="/minha-reserva">Minha reserva</a>
          ) : (
            <a href="/equipe">Acesso da equipe</a>
          )}
        </nav>
        <h1>Food Flow - Pedidos</h1>
        <p>
          {profile === 'garcom'
            ? 'Salão · anotar pedidos e acompanhar entregas'
            : 'Pedido da mesa · à la carte e degustação'}
        </p>
      </header>
      <p>
        Ambiente demonstrativo: dados deste navegador e perfis sem autenticação.
      </p>
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {profile === 'cliente' && !commands.length && (
        <p role="status">
          Consulte <a href="/minha-reserva">sua reserva</a>. Pedidos são
          liberados somente após a acomodação e enquanto a comanda estiver
          aberta.
        </p>
      )}

      <section className="tables-section">
        <h2>Mesas com comandas abertas</h2>
        {!tables.some((table) => table.status === 'aberta') &&
          profile === 'garcom' && (
            <p>
              Nenhuma comanda aberta. Aguarde a recepção confirmar a acomodação.
            </p>
          )}

        <div className="tables-grid">
          {tables
            .filter((table) => table.status === 'aberta')
            .map((table) => {
              const command = commands.find(
                (item) => item.id === table.commandId,
              );

              return (
                <button
                  key={table.id}
                  className={
                    selectedCommand?.id === table.commandId
                      ? 'table-card selected'
                      : 'table-card'
                  }
                  onClick={() => openCommand(table.commandId)}
                >
                  <strong>Mesa {table.number}</strong>
                  <span>Comanda #{table.commandId}</span>
                  <span>{command?.rounds.length || 0} rodada(s)</span>
                  {profile === 'garcom' &&
                    command?.calls?.some(
                      (call) => call.status === 'pendente',
                    ) && <strong>Cliente chamou o garçom</strong>}
                </button>
              );
            })}
        </div>
      </section>

      {selectedCommand && (
        <section className="command-section">
          <h2>Comanda #{selectedCommand.id}</h2>

          <p>
            Mesa{' '}
            {
              tables.find((table) => table.id === selectedCommand.tableId)
                ?.number ?? selectedCommand.tableId
            }
          </p>

          {selectedCommand.status === 'aberta' && <OrderComposer
            key={selectedCommand.id}
            onSend={sendOrder}
            loading={loading}
            maxPeople={
              selectedCommand.partySize ??
              tables.find((table) => table.id === selectedCommand.tableId)
                ?.capacity ??
              8
            }
            isWaiter={profile === 'garcom'}
          />}
          {selectedCommand.status === 'fechada' && <p role="status">Comanda fechada. Consulte o resumo e procure a recepção para registrar a saída.</p>}
          {profile === 'cliente' && selectedCommand.status === 'aberta' && (
            <button
              className="menu-action"
              onClick={async () => {
                try {
                  await ordersApi.callWaiter(selectedCommand.id);
                  setFeedback('Garçom chamado. Aguarde o atendimento.');
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              Chamar garçom
            </button>
          )}
          {profile === 'cliente' && selectedCommand.status === 'aberta' && (
            <button className="menu-action" onClick={async () => {
              try {
                await ordersApi.callWaiter(selectedCommand.id, 'fechamento_presencial');
                setFeedback('Fechamento presencial solicitado. Aguarde o garçom; a conta ainda não foi paga.');
              } catch (failure) { setError(failure.message); }
            }}>Solicitar fechamento presencial</button>
          )}
          {profile === 'garcom' && selectedCommand.status === 'aberta' &&
            selectedCommand.calls
              ?.filter((call) => call.status === 'pendente')
              .map((call) => (
                <div
                  className="order-draft"
                  key={call.id}
                >
                  <p>{call.type === 'fechamento_presencial'
                    ? 'Cliente solicitou fechamento presencial. Atender a chamada não registra pagamento nem fecha a conta.'
                    : 'Cliente solicitou atendimento nesta mesa.'}</p>
                  <button
                    className="menu-action"
                    onClick={async () => {
                      try {
                        await ordersApi.attendCall(selectedCommand.id, call.id);
                        setFeedback('Chamada atendida.');
                      } catch (failure) {
                        setError(failure.message);
                      }
                    }}
                  >
                    Confirmar atendimento
                  </button>
                </div>
              ))}

          <OrderRounds
            command={selectedCommand}
            onDeliver={deliverRound}
            isWaiter={profile === 'garcom' && selectedCommand.status === 'aberta'}
          />

          <OrderBill command={selectedCommand} />
          {selectedCommand.tasting && (
            <p>
              Registro anterior de degustação:{' '}
              {selectedCommand.tasting.beverage} ·{' '}
              {selectedCommand.tasting.servingTime}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

import OrderItems from './OrderItems.jsx';

export default function OrderRounds({ command, onDeliver, isWaiter }) {
  if (!command || command.rounds.length === 0) {
    return (
      <section className="rounds-section">
        <h2>Rodadas da comanda</h2>
        <p>Nenhum pedido foi enviado ainda.</p>
      </section>
    );
  }

  return (
    <section className="rounds-section">
      <h2>Rodadas da comanda</h2>

      {command.rounds.map((round) => (
        <article
          className="round-card"
          key={round.id}
        >
          <div className="round-header">
            <h3>Rodada {round.number}</h3>

            <span
              className={
                round.status === 'entregue'
                  ? 'status-delivered'
                  : 'status-preparing'
              }
            >
              {round.status === 'entregue'
                ? 'Todos os itens foram entregues'
                : round.readyAt ? 'Aguardando garçom' : round.startedAt ? 'Em preparo' : 'Pedido recebido'}
            </span>
          </div>

          <ol className="order-progress" aria-label={`Timeline do pedido ${round.number}`}>
            {['Pedido enviado', 'Em preparo', 'Aguardando garçom', 'Entregue'].map((label, index) => {
              const stage = round.status === 'entregue' ? 3 : round.readyAt ? 2 : round.startedAt ? 1 : 0;
              return <li key={label} className={index <= stage ? 'is-active' : ''} aria-current={index === stage ? 'step' : undefined}><span aria-hidden="true">{index < stage ? '✓' : index + 1}</span>{label}</li>;
            })}
          </ol>

          <p>{round.source === 'garcom' ? 'Pedido registrado pelo garçom.' : 'Pedido enviado pelo cliente.'}</p>
          {round.notes && (
            <p>
              <strong>Observações:</strong> {round.notes}
            </p>
          )}
          <OrderItems items={round.items} />

          {isWaiter && round.status !== 'entregue' && (
            <button
              className="deliver-button"
              disabled={!round.readyAt}
              onClick={() => onDeliver(round.id)}
            >
              Confirmar entrega desta rodada
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

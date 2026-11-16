
export default function OrderRounds({
  command,
  onDeliver,
  isWaiter,
}) {
  if (!command || command.rounds.length === 0) {
    return (
      <section className="rounds-section">
        <h2>Pedidos da comanda</h2>
        <p>Nenhum pedido foi enviado ainda.</p>
      </section>
    );
  }

  return (
    <section className="rounds-section">
      <h2>Pedidos da comanda</h2>

      {command.rounds.map((round) => (
        <article className="round-card" key={round.id}>
          <div className="round-header">
            <h3>Rodada {round.number}</h3>

            <span
              className={
                round.status === "entregue"
                  ? "status-delivered"
                  : "status-preparing"
              }
            >
              {round.status === "entregue"
                ? "Todos os itens foram entregues"
                : "Em preparo"}
            </span>
          </div>

          <p>
            Pedido realizado por:{" "}
            {round.source === "garcom" ? "Garçom" : "Cliente"}
          </p>

          <ul>
            {round.items.map((item) => (
              <li key={item.id}>
                {item.quantity}x {item.name} — R${" "}
                {(item.price * item.quantity)
                  .toFixed(2)
                  .replace(".", ",")}
              </li>
            ))}
          </ul>

          {isWaiter && round.status !== "entregue" && (
            <button
              className="deliver-button"
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

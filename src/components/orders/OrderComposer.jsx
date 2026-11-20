import { useState } from 'react';
import MenuCatalog from '../MenuCatalog.jsx';
import { menu, tastingMenus, money } from '../../lib/menu.js';

export default function OrderComposer({
  onSend,
  loading,
  maxPeople = 8,
  isWaiter = false,
}) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  function addItem(item) {
    setItems((previous) => {
      const existing = previous.findIndex((entry) =>
        item.kind === 'degustacao'
          ? entry.kind === 'degustacao' &&
            entry.menuId === item.menuId &&
            entry.beverageCode === item.beverageCode &&
            entry.servingTime === item.servingTime
          : entry.kind !== 'degustacao' && entry.productId === item.productId,
      );
      if (existing < 0) return [...previous, item];
      return previous.map((entry, index) =>
        index !== existing
          ? entry
          : item.kind === 'degustacao'
            ? { ...entry, people: entry.people + item.people }
            : { ...entry, quantity: entry.quantity + item.quantity },
      );
    });
    setFeedback('Adicionado à rodada. Revise e envie o pedido abaixo.');
  }
  const lines = items.map((item) => {
    const product =
      item.kind === 'degustacao'
        ? tastingMenus.find((entry) => entry.id === item.menuId)
        : menu.find((entry) => entry.id === item.productId);
    const count = item.people ?? item.quantity;
    return {
      ...item,
      name: product.name,
      count,
      total: product.priceCents * count,
    };
  });
  async function submit(event) {
    event.preventDefault();
    if (!items.length) return;
    const sent = await onSend(items, { notes });
    if (sent) {
      setItems([]);
      setNotes('');
      setFeedback('Rodada enviada. Acompanhe o status abaixo.');
    }
  }
  return (
    <section
      className="order-composer"
      aria-label="Anotar novo pedido"
    >
      <h2>{isWaiter ? 'Anotar pedido da mesa' : 'O que vamos pedir?'}</h2>
      <p>
        {isWaiter
          ? 'Escolha os itens, informe quantidades, confira a rodada e envie para a cozinha.'
          : 'Uma pessoa faz o pedido da mesa. Você também pode chamar o garçom.'}
      </p>
      <MenuCatalog
        onAdd={addItem}
        maxPeople={maxPeople}
        disabled={loading}
      />
      <form
        className="order-draft"
        onSubmit={submit}
      >
        <h3>Revisar esta rodada</h3>
        <p role="status">{feedback || 'Nenhum item adicionado.'}</p>
        <ul>
          {lines.map((item, index) => (
            <li key={index}>
              <div>
                <strong>
                  {item.count} × {item.name}
                </strong>
                {item.kind === 'degustacao' && (
                  <small>
                    Bebida: {item.beverageCode}
                    {item.servingTime && ' · ' + item.servingTime}
                  </small>
                )}
                <span>{money(item.total)}</span>
              </div>
              <button
                type="button"
                aria-label={'Remover ' + item.name}
                onClick={() =>
                  setItems((previous) =>
                    previous.filter((_, position) => position !== index),
                  )
                }
                disabled={loading}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        {!!lines.length && (
          <p>
            <strong>
              Subtotal desta rodada:{' '}
              {money(lines.reduce((sum, item) => sum + item.total, 0))}
            </strong>
          </p>
        )}
        <label htmlFor="order-notes">Observações para a cozinha</label>
        <textarea
          id="order-notes"
          maxLength="500"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: bebida com o prato principal"
        />
        <button
          className="menu-action"
          type="submit"
          disabled={loading || !items.length}
        >
          {loading ? 'Enviando…' : 'Confirmar e enviar pedido'}
        </button>
        <small>
          Os adicionais aparecem no resumo da comanda depois do envio.
        </small>
      </form>
    </section>
  );
}

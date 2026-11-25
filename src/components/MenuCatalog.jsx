import { useState } from 'react';
import { tastingMenus, money, productImage, servingOptions } from '../lib/menu.js';
import '../styles/menu.css';
import ALaCarteCatalog from './ALaCarteCatalog.jsx';

function TastingCard({ menu, onAdd, maxPeople, disabled }) {
  const [people, setPeople] = useState(1);
  const beverages = menu.items.filter((item) => item.category === 'Bebida');
  const [beverage, setBeverage] = useState(beverages[0].id);
  const [time, setTime] = useState('casa');
  return (
    <article className="tasting-menu-card">
      <img
        src={productImage(menu.id)}
        alt={'Apresentação ilustrativa do ' + menu.name}
        loading="lazy"
        width="768"
        height="512"
      />
      <div className="tasting-menu-body">
        <h3>{menu.name}</h3>
        {menu.description && (
          <p className="menu-description">{menu.description}</p>
        )}
        <p className="menu-price">
          {money(menu.priceCents)} <small>por pessoa</small>
        </p>
        <ul>
          {menu.items
            .filter((item) => item.category !== 'Bebida')
            .map((item) => (
              <li key={item.id}>
                <strong>{item.category}</strong>
                <span>{item.name}</span>
                <small>{item.description}</small>
                {item.detailDescription && (
                  <p className="menu-description">{item.detailDescription}</p>
                )}
              </li>
            ))}
        </ul>
        <p className="menu-description">
          Uma bebida por pessoa:{' '}
          {beverages.map((item) => item.name).join(' ou ')}.
        </p>
        {onAdd ? (
          <form
            className="tasting-options"
            onSubmit={(event) => {
              event.preventDefault();
              onAdd({
                kind: 'degustacao',
                menuId: menu.id,
                people: Number(people),
                beverageCode: beverage,
                servingTime: time,
              });
            }}
          >
            <label htmlFor={'people-' + menu.id}>Pessoas neste menu</label>
            <input
              id={'people-' + menu.id}
              type="number"
              min="1"
              max={maxPeople}
              step="1"
              required
              value={people}
              onChange={(event) => setPeople(event.target.value)}
            />
            <label htmlFor={'beverage-' + menu.id}>
              Bebida para este grupo
            </label>
            <select
              id={'beverage-' + menu.id}
              value={beverage}
              onChange={(event) => setBeverage(event.target.value)}
            >
              {beverages.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
            <fieldset className="flow-serving-options">
              <legend>Quando servir a bebida?</legend>
              {servingOptions.map(option => <label key={option.value}>
                <input type="radio" name={`serving-${menu.id}`} value={option.value}
                  checked={time === option.value} onChange={() => setTime(option.value)} disabled={disabled} />
                {option.label}
              </label>)}
            </fieldset>
            <p className="menu-line-total">
              {money(menu.priceCents * (Number(people) || 0))}
            </p>
            <button
              type="submit"
              className="menu-action"
              disabled={disabled}
            >
              Adicionar menu à rodada
            </button>
            <small>Para bebidas diferentes, adicione grupos separados.</small>
          </form>
        ) : (
          <a
            className="menu-action"
            href="/minha-reserva"
          >
            Pedir pela minha reserva
          </a>
        )}
      </div>
    </article>
  );
}

export default function MenuCatalog({
  onAdd,
  maxPeople = 8,
  disabled = false,
}) {
  const [mode, setMode] = useState('');
  return (
    <div className="menu-catalog">
      <div
        className="menu-paths"
        role="group"
        aria-label="Escolha como pedir"
      >
        <button
          type="button"
          aria-pressed={mode === 'a-la-carte'}
          className={'menu-path ' + (mode === 'a-la-carte' ? 'is-active' : '')}
          onClick={() => setMode('a-la-carte')}
        >
          <span>POR PRATO</span>
          <strong>À la carte</strong>
          <small>Monte a seleção item a item.</small>
        </button>
        <button
          type="button"
          aria-pressed={mode === 'degustacao'}
          className={'menu-path ' + (mode === 'degustacao' ? 'is-active' : '')}
          onClick={() => setMode('degustacao')}
        >
          <span>VALOR POR PESSOA</span>
          <strong>Menu degustação</strong>
          <small>Escolha entre Mar, Terra ou Vegano.</small>
        </button>
      </div>
      {!mode && (
        <p className="menu-description">
          Escolha um dos caminhos acima para conhecer os pratos. É possível
          combinar os dois na mesma comanda.
        </p>
      )}
      {mode === 'a-la-carte' && (
        <ALaCarteCatalog
          onAdd={onAdd}
          disabled={disabled}
        />
      )}
      {mode === 'degustacao' && (
        <section aria-label="Três menus degustação">
          <p className="menu-description">
            Menu escolhido × pessoas. Sem serviço ou couvert adicionais neste
            menu. Estacionamento separado: R$ 7,90 por mesa, quando utilizado.
          </p>
          <div className="tasting-menu-grid">
            {tastingMenus.map((menu) => (
              <TastingCard
                key={menu.id}
                menu={menu}
                onAdd={onAdd}
                maxPeople={maxPeople}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      )}
      <p className="menu-photo-note">
        Imagens ilustrativas geradas por IA. A apresentação dos pratos pode
        variar.
      </p>
    </div>
  );
}

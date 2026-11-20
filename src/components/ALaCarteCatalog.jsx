import { useEffect, useRef, useState } from 'react';
import { categories, filterMenu, money, productImage } from '../lib/menu.js';

// A coluna Descrição da planilha atual contém porção/peso, não texto do prato.
function servingInfo(item) {
  const text = item.description ?? '';
  const count = text.match(/porção com\s+(\d+)/i)?.[1] ?? '1';
  const amount = text.match(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i);
  return {
    portion: `Porção com ${count}`,
    measure: amount
      ? `${amount[2].toLowerCase() === 'ml' ? 'Volume' : 'Peso'}: Aprox. ${amount[1]} ${amount[2].toLowerCase()}`
      : 'Peso: ainda não informado',
  };
}

function ProductDetails({ item, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  function close() {
    dialog.current.close();
    onClose();
  }
  const serving = servingInfo(item);
  return (
    <dialog
      ref={dialog}
      className="product-details"
      aria-labelledby="product-details-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="product-details-content">
        <button
          type="button"
          className="details-close"
          autoFocus
          onClick={close}
        >
          Fechar descrição
        </button>
        <img
          src={productImage(item.id)}
          alt={'Imagem ilustrativa: ' + item.name}
          width="768"
          height="512"
        />
        <p className="menu-code">
          {item.category} · {item.subcategory}
        </p>
        <h2 id="product-details-title">{item.name}</h2>
        <p>
          {serving.portion} · {serving.measure}
        </p>
        <strong className="menu-price">{money(item.priceCents)}</strong>
        <h3>Descrição do prato</h3>
        <p>
          {item.detailDescription?.trim() ||
            'A descrição deste produto ainda será adicionada.'}
        </p>
        <small>Imagem ilustrativa gerada por IA.</small>
      </div>
    </dialog>
  );
}

function CategoryRow({ category, onAdd, disabled, onDetails }) {
  const rail = useRef(null);
  const [quantities, setQuantities] = useState({});
  const products = filterMenu('', category.prefix);
  return (
    <section
      className="category-row"
      aria-labelledby={'heading-' + category.prefix}
    >
      <div className="category-row-heading">
        <h3 id={'heading-' + category.prefix}>{category.label}</h3>
        <div className="carousel-controls">
          <button
            type="button"
            aria-label={'Ver produtos anteriores de ' + category.label}
            onClick={() =>
              rail.current.scrollBy({
                left: -rail.current.clientWidth * 0.8,
                behavior: 'smooth',
              })
            }
          >
            Anterior
          </button>
          <button
            type="button"
            aria-label={'Ver próximos produtos de ' + category.label}
            onClick={() =>
              rail.current.scrollBy({
                left: rail.current.clientWidth * 0.8,
                behavior: 'smooth',
              })
            }
          >
            Próximo
          </button>
        </div>
      </div>
      <div
        ref={rail}
        className="category-carousel"
        tabIndex={0}
        role="region"
        aria-label={'Produtos de ' + category.label + ', rolagem horizontal'}
      >
        {products.map((item) => {
          const serving = servingInfo(item);
          return (
            <article
              className="catalog-product"
              key={item.id}
            >
              <button
                type="button"
                className="product-photo-button"
                aria-label={'Ver descrição de ' + item.name}
                onClick={() => onDetails(item)}
              >
                <img
                  src={productImage(item.id)}
                  alt={'Imagem ilustrativa: ' + item.name}
                  loading="lazy"
                  width="768"
                  height="512"
                />
                <span>Ver descrição</span>
              </button>
              <div className="catalog-product-body">
                <p className="product-category">
                  Categoria:{' '}
                  {item.category === 'Bebida' ? 'Bebida' : item.subcategory}
                </p>
                <h4>{item.name}</h4>
                <p className="product-serving">{serving.portion}</p>
                <p className="product-serving">{serving.measure}</p>
                <strong className="menu-price">{money(item.priceCents)}</strong>
                {onAdd ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      onAdd({
                        productId: item.id,
                        quantity: Number(quantities[item.id] ?? 1),
                      });
                    }}
                  >
                    <label htmlFor={'qty-' + item.id}>Quantidade</label>
                    <input
                      id={'qty-' + item.id}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={quantities[item.id] ?? 1}
                      onChange={(event) =>
                        setQuantities((previous) => ({
                          ...previous,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="submit"
                      className="menu-action"
                      disabled={disabled}
                    >
                      Incluir no pedido
                    </button>
                  </form>
                ) : (
                  <a
                    className="menu-action"
                    href="/minha-reserva"
                  >
                    Selecionar para pedir
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function ALaCarteCatalog({ onAdd, disabled }) {
  const [selected, setSelected] = useState(() =>
    categories.map((category) => category.prefix),
  );
  const [details, setDetails] = useState(null);
  const rows = ['BEB', 'ENT', 'PRI', 'SOB'].map((prefix) =>
    categories.find((category) => category.prefix === prefix),
  );
  return (
    <section aria-label="Cardápio à la carte">
      <div
        className="category-filters"
        role="group"
        aria-label="Filtrar categorias"
      >
        {categories.map((category) => (
          <button
            type="button"
            key={category.prefix}
            aria-pressed={selected.includes(category.prefix)}
            onClick={() =>
              setSelected((previous) =>
                previous.includes(category.prefix)
                  ? previous.filter((prefix) => prefix !== category.prefix)
                  : [...previous, category.prefix],
              )
            }
          >
            {category.prefix === 'PRI'
              ? 'Principal'
              : category.prefix === 'SOB'
                ? 'Sobremesa'
                : category.label}
          </button>
        ))}
      </div>
      <p className="menu-description">
        Selecione as categorias que deseja visualizar. Deslize cada fileira para
        explorar os produtos.
      </p>
      <p className="menu-description">
        Itens da mesa + 10% de serviço + 10% de couvert. Estacionamento: R$ 7,90
        por mesa, quando utilizado.
      </p>
      {rows
        .filter((category) => selected.includes(category.prefix))
        .map((category) => (
          <CategoryRow
            key={category.prefix}
            category={category}
            onAdd={onAdd}
            disabled={disabled}
            onDetails={setDetails}
          />
        ))}
      {!selected.length && (
        <p role="status">
          Selecione uma categoria para visualizar os produtos.
        </p>
      )}
      {details && (
        <ProductDetails
          item={details}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  );
}

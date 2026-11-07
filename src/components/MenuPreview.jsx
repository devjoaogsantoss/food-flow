import { useState } from 'react';
import Icon from './Icon.jsx';
import { SectionHeading } from './Layout.jsx';
const categories = ['Entradas', 'Principal', 'Sobremesa', 'Bebida'];
export default function MenuPreview() {
  const [active, setActive] = useState(0);
  function onKeyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % categories.length;
    if (event.key === 'ArrowLeft')
      next = (index + categories.length - 1) % categories.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = categories.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
      document.getElementById('category-' + next).focus();
    }
  }
  return (
    <section
      id="cardapio"
      className="section menu-section"
    >
      <div className="container">
        <div className="menu-heading">
          <SectionHeading
            eyebrow="ESCOLHA COM TRANQUILIDADE"
            title="Um convite ao seu paladar."
          >
            Conheça o cardápio antes de chegar à mesa.
          </SectionHeading>
          <span className="badge">Cardápio em preparação</span>
        </div>
        <div
          className="tabs"
          role="tablist"
          aria-label="Categorias do cardápio"
        >
          {categories.map((category, index) => (
            <button
              key={category}
              id={'category-' + index}
              role="tab"
              aria-selected={active === index}
              aria-controls={'panel-' + index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {category}
            </button>
          ))}
        </div>
        {categories.map((category, index) => (
          <div
            key={category}
            className="empty-menu"
            role="tabpanel"
            id={'panel-' + index}
            aria-labelledby={'category-' + index}
            hidden={active !== index}
            tabIndex={0}
          >
            <span className="empty-icon">
              <Icon
                name="book"
                size={30}
              />
            </span>
            <h3>{category}: novos sabores em breve.</h3>
            <p>
              Os itens desta categoria ainda não foram cadastrados.
              <br />
              Aqui você encontrará pratos, descrições e preços do Santo Garfo.
            </p>
            <span className="small-note">
              Demonstração · Nenhum item disponível
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

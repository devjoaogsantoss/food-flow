import { useState, useRef } from 'react';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
export function ButtonLink({ href, children, secondary = false }) {
  return (
    <a
      className={'button' + (secondary ? ' button-secondary' : '')}
      href={href}
    >
      {children}
      <Icon
        name="arrow"
        size={18}
      />
    </a>
  );
}
export function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className="support">{children}</p>}
    </div>
  );
}
function Navigation({ onNavigate }) {
  return (
    <>
      <a
        href="#inicio"
        onClick={onNavigate}
      >
        Início
      </a>
      <a
        href="#cardapio"
        onClick={onNavigate}
      >
        Cardápio
      </a>
      <a
        href="#reservas"
        onClick={onNavigate}
      >
        Reservas
      </a>
    </>
  );
}
export function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  return (
    <header className="header">
      <div className="institutional">
        <div className="container institutional-inner">
          <span>Uma experiência no seu tempo.</span>
          <span className="slogan">
            <Icon
              name="clock"
              size={14}
            />
            Todo segundo conta
          </span>
        </div>
      </div>
      <div className="container header-inner">
        <a
          href="#inicio"
          aria-label="Food Flow — início"
          className="brand-link"
        >
          <Brand />
        </a>
        <nav
          className="desktop-nav"
          aria-label="Navegação principal"
        >
          <Navigation />
        </nav>
        <a
          className="team-link"
          href="#equipe"
        >
          <Icon
            name="lock"
            size={15}
          />
          Área da equipe
        </a>
        <button
          ref={toggle}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Fechar navegação' : 'Abrir navegação'}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Navegação mobile"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            toggle.current.focus();
          }
        }}
      >
        <Navigation onNavigate={() => setOpen(false)} />
        <a
          href="#equipe"
          onClick={() => setOpen(false)}
        >
          Área da equipe
        </a>
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-main">
        <div>
          <a
            className="brand-link"
            href="#inicio"
          >
            <Brand inverse />
          </a>
          <p>
            Todo segundo conta.
            <br />
            Cada experiência também.
          </p>
        </div>
        <div>
          <p className="footer-label">NOSSO PRIMEIRO RESTAURANTE</p>
          <Brand restaurant />
          <p>Um encontro com o Santo Garfo.</p>
        </div>
        <nav aria-label="Navegação do rodapé">
          <Navigation />
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>Food Flow · Projeto acadêmico</span>
        <span>Santo Garfo é um restaurante fictício para demonstração.</span>
      </div>
    </footer>
  );
}

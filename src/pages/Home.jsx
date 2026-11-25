import { useEffect, useRef, useState } from 'react';
import ProductShell from '../components/ProductShell.jsx';
import { productImage, tastingMenus } from '../lib/menu.js';

function MenuCarousel() {
  const track = useRef(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = track.current;
    if (!element || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      if (element.matches(':hover') || element.contains(document.activeElement)) return;
      const loopWidth = element.scrollWidth / 2;
      if (loopWidth > 0 && element.scrollLeft >= loopWidth) element.scrollLeft -= loopWidth;
      element.scrollLeft += 0.35;
    }, 40);
    return () => window.clearInterval(timer);
  }, [paused]);

  return <>
  <div className="client-carousel-tools"><p>Deslize para conhecer os menus.</p><button type="button" aria-pressed={paused} aria-label={paused ? 'Retomar rolagem dos menus' : 'Pausar rolagem dos menus'} onClick={() => setPaused(value => !value)}>{paused ? 'Retomar rolagem' : 'Pausar rolagem'}</button></div>
  <div className="client-tasting-carousel" ref={track} role="region" tabIndex={0} aria-label="Menus degustação, carrossel com rolagem horizontal">
    {[...tastingMenus, ...tastingMenus].map((menu, index) => {
      const repeated = index >= tastingMenus.length;
      return <article className="client-tasting-card" key={`${menu.id}-${index}`} aria-hidden={repeated || undefined}>
        <div className="client-menu-photo" aria-label={`Pratos do ${menu.name}`}>
          {menu.items.map((item, itemIndex) => <figure className="client-menu-dish" key={`${item.id}-${itemIndex}`}>
            <img src={productImage(item.id)} alt={repeated ? '' : item.name} loading="lazy" decoding="async" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = productImage(({ Bebida:'BEB001', Entrada:'ENT002', Principal:'PRI001', Sobremesa:'SOB001' })[item.category] ?? 'PRI001'); }}/>
            <figcaption>{item.name}</figcaption>
          </figure>)}
        </div>
        <div className="client-tasting-card-copy"><h3>{menu.name}</h3><a className="product-button secondary" href={`/cliente/cardapio?menu=${encodeURIComponent(menu.id)}`} tabIndex={repeated ? -1 : undefined}>Conhecer o menu</a></div>
      </article>;
    })}
  </div></>;
}

export default function Home() {
  useEffect(() => {
    const root = document.querySelector('.product-home');
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        root.style.setProperty('--home-bg-scroll', `${Math.round(window.scrollY * 0.12)}px`);
        frame = 0;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty('--home-bg-scroll');
    };
  }, []);

  return <ProductShell publicHome title="" description="">
    <section className="client-seasonal-banner" aria-labelledby="seasonal-banner-title">
      <img className="seasonal-banner-background" src="/images/litoral-tropical-dourado.jpg" alt="" fetchPriority="high"/>
      <div className="seasonal-banner-copy">
        <h1 id="seasonal-banner-title">Novo menu <span>sazonal</span></h1>
        <p>Sabores inspirados no litoral para esta estação.</p>
        <a className="product-button" href="/cliente/cardapio">Explorar o menu <span aria-hidden="true">→</span></a>
      </div>
      <div className="seasonal-banner-visual" role="img" aria-label="Colagem de pratos sobre o retrato do chef">
        <img className="seasonal-chef-image" src="/images/chef-carmy.jpg" alt="" loading="lazy"/>
        <span className="seasonal-chef-caption">Criação do <strong>Chef Carmy</strong></span>
        <img className="seasonal-dish seasonal-dish-main" src={productImage('PRI001')} alt="" loading="lazy"/>
        <img className="seasonal-dish seasonal-dish-small" src={productImage('ENT002')} alt="" loading="lazy"/>
        <img className="seasonal-dish seasonal-dish-dessert" src={productImage('SOB001')} alt="" loading="lazy"/>
        <span className="seasonal-banner-shape" />
      </div>
    </section>
    <section className="client-intro" aria-labelledby="client-intro-title">
      <div className="client-intro-grid"><h1 id="client-intro-title">A Experiência da Terra ao Mar</h1><div><p>Escolha seus pratos e acompanhe cada etapa do atendimento.</p><div className="product-actions"><a className="product-button" href="/cliente/reservar">Realizar reserva</a><a className="product-button secondary" href="/cliente/cardapio">Conferir cardápio</a></div></div></div>
    </section>
    <section className="client-tasting-section" aria-labelledby="client-menus-title"><div className="client-section-label"><span>Cardápio</span></div><div className="client-tasting-heading"><h2 id="client-menus-title">Menus degustação</h2><p>Cada card reúne os pratos de uma experiência.</p></div><MenuCarousel/></section>
  </ProductShell>;
}

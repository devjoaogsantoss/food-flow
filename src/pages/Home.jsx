import Brand from '../components/Brand.jsx';
import Icon from '../components/Icon.jsx';
import {
  Header,
  Footer,
  ButtonLink,
  SectionHeading,
} from '../components/Layout.jsx';
import MenuPreview from '../components/MenuPreview.jsx';
import Reservations from '../components/Reservations.jsx';
const moments = [
  {
    number: '01',
    icon: 'book',
    title: 'Antes da visita',
    text: 'Consulte pratos, descrições e preços com privacidade.',
    detail: 'Descubra no seu ritmo.',
  },
  {
    number: '02',
    icon: 'bell',
    title: 'Durante o atendimento',
    text: 'Escolha entre fazer pedidos pelo site ou contar com o garçom.',
    detail: 'A escolha é sempre sua.',
  },
  {
    number: '03',
    icon: 'check',
    title: 'No fechamento',
    text: 'Pague pelo site ou solicite atendimento da equipe.',
    detail: 'Mais tempo para aproveitar.',
  },
];
export default function Home() {
  return (
    <>
      <a
        className="skip-link"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <section
          id="inicio"
          className="hero"
        >
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="tiny-line" />À MESA, NO SEU TEMPO
              </p>
              <h1>
                Sua experiência
                <br className="desktop-break" /> começa antes de
                <br className="desktop-break" /> chegar à <span>mesa.</span>
              </h1>
              <p className="hero-description">
                Explore o cardápio, conheça os preços e escolha como viver sua
                experiência gastronômica.
              </p>
              <div className="hero-actions">
                <ButtonLink href="#cardapio">Ver cardápio</ButtonLink>
                <ButtonLink
                  href="#reservas"
                  secondary
                >
                  Reservar uma mesa
                </ButtonLink>
              </div>
              <div className="hero-signature">
                <span>ESTREANDO COM</span>
                <Brand restaurant />
              </div>
            </div>
            <div
              className="hero-art"
              aria-hidden="true"
            >
              <div className="art-top">
                <span>BOA COMIDA. BOAS CONVERSAS.</span>
                <span>01 / FF</span>
              </div>
              <div className="table-setting">
                <div className="napkin" />
                <div className="fork">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="plate">
                  <div className="plate-center">
                    <span>O melhor da experiência?</span>
                    <strong>Estar presente.</strong>
                    <span className="plate-rule" />
                  </div>
                </div>
                <div className="knife" />
              </div>
              <div className="art-bottom">
                <span>SANTO GARFO</span>
                <span>Seu próximo encontro começa aqui.</span>
              </div>
            </div>
          </div>
        </section>
        <section className="section experience-section">
          <div className="container">
            <SectionHeading
              eyebrow="A EXPERIÊNCIA FOOD FLOW"
              title="Menos espera. Mais presença."
            >
              Uma proposta pensada para cada momento da sua visita.
            </SectionHeading>
            <div className="moments">
              {moments.map((moment) => (
                <article
                  className="moment"
                  key={moment.number}
                >
                  <div className="moment-top">
                    <Icon
                      name={moment.icon}
                      size={28}
                    />
                    <span>{moment.number}</span>
                  </div>
                  <h3>{moment.title}</h3>
                  <p>{moment.text}</p>
                  <span className="moment-detail">{moment.detail}</span>
                </article>
              ))}
            </div>
            <p className="scope-note">
              Conheça a proposta da plataforma. Pedidos e pagamentos fazem parte
              de uma etapa futura.
            </p>
          </div>
        </section>
        <section
          id="restaurante"
          className="restaurant-section"
        >
          <div className="container restaurant-grid">
            <div className="restaurant-intro">
              <p className="eyebrow">O PRIMEIRO ENCONTRO</p>
              <h2>
                <Brand restaurant />
              </h2>
              <span className="restaurant-rule" />
              <p>
                O primeiro restaurante da plataforma Food Flow. Duas formas de
                viver sua experiência, com a liberdade de escolher.
              </p>
              <span className="restaurant-caption">
                Restaurante fictício · Experiência de demonstração
              </span>
            </div>
            <div className="dining-options">
              <article>
                <span className="option-index">01 / À SUA ESCOLHA</span>
                <h3>À la carte</h3>
                <p>Explore as categorias e escolha a sua experiência.</p>
                <a href="#cardapio">
                  Conhecer o cardápio
                  <Icon
                    name="arrow"
                    size={18}
                  />
                </a>
              </article>
              <article>
                <span className="option-index">
                  02 / UMA EXPERIÊNCIA COMPLETA
                </span>
                <div className="tasting-heading">
                  <h3>Menu degustação</h3>
                  <span className="price">R$ 239,90</span>
                </div>
                <p>
                  Duas entradas, um principal, uma sobremesa e uma opção de duas
                  bebidas.
                </p>
                <span className="dining-note">
                  Os pratos serão apresentados no cardápio.
                </span>
              </article>
            </div>
          </div>
        </section>
        <MenuPreview />
        <Reservations />
        <section
          id="equipe"
          className="team-section"
        >
          <div className="container team-content">
            <Icon name="lock" />
            <div>
              <h2>Um espaço para quem cuida de cada detalhe.</h2>
              <p>
                Área da equipe em preparação. O acesso ao restaurante estará
                disponível em uma próxima etapa.
              </p>
            </div>
            <span className="badge">Em breve</span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import { SectionHeading } from './Layout.jsx';
import MenuCatalog from './MenuCatalog.jsx';
export default function MenuPreview() {
  return (
    <section
      id="cardapio"
      className="section menu-section"
    >
      <div className="container">
        <SectionHeading
          eyebrow="À MESA DO SANTO GARFO"
          title="Duas formas de viver o sabor."
        >
          Escolha seus favoritos à la carte ou descubra um dos nossos três menus
          degustação.
        </SectionHeading>
        <MenuCatalog />
      </div>
    </section>
  );
}

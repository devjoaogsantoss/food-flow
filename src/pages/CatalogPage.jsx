import ProductShell from '../components/ProductShell.jsx';
import MenuCatalog from '../components/MenuCatalog.jsx';
export default function CatalogPage() {
  const code = new URLSearchParams(location.search).get('reserva');
  return <ProductShell title="Cardápio" description="Conheça os pratos, menus e valores do Santo Garfo." active="cardapio" code={code}><section className="product-surface"><MenuCatalog /></section></ProductShell>;
}

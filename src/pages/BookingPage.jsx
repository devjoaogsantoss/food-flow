import ProductShell from '../components/ProductShell.jsx';
import Reservations from '../components/Reservations.jsx';
export default function BookingPage() {
  const code = new URLSearchParams(location.search).get('reserva');
  return <ProductShell title="Reserve sua mesa" description="Escolha a data, o horário e o tamanho do grupo." active="reservar" code={code}><Reservations initialCode={code} /></ProductShell>;
}

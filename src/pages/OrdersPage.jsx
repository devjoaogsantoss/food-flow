import ClientPage from './ClientPage.jsx';
import WaiterPage from './WaiterPage.jsx';
// Compatibilidade com links anteriores; as experiências têm componentes próprios.
export default function OrdersPage(){return new URLSearchParams(location.search).has('reserva')?<ClientPage/>:<WaiterPage/>;}

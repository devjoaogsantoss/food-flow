import { useEffect, useState } from 'react';
import ProductShell, { clientLink } from '../components/ProductShell.jsx';
import { request } from '../services/remoteApi.js';
export default function DemoPage() {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { request('GET', '/testing/reservations').then(setReservations).catch(failure => setError(failure.message)); }, []);
  return <ProductShell title="Reservas de teste" description="Abra cada cliente em uma aba. Nenhuma senha de reserva é necessária.">
    {error && <p role="alert">{error}</p>}
    <div className="product-card-grid">{reservations.map(reservation => <article className="product-surface" key={reservation.id}><h2>{reservation.guestName}</h2><p>{reservation.date.split('-').reverse().join('/')} · {reservation.service} · {reservation.partySize} pessoas</p><a className="product-button" href={clientLink('visita', reservation.id)} target="_blank" rel="noreferrer">Abrir como cliente ↗</a></article>)}</div>
    {!error && !reservations.length && <p>Não há reservas do cenário de teste neste ambiente.</p>}
  </ProductShell>;
}

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { resolvePage } from './lib/routes.js';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './styles/index.css';
import './styles/experience.css';
import './styles/product.css';

const Home = lazy(() => import('./pages/Home.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const ReceptionPage = lazy(() => import('./pages/ReceptionPage.jsx'));
const StaffPage = lazy(() => import('./pages/StaffPage.jsx'));
const KitchenPage = lazy(() => import('./pages/KitchenPage.jsx'));
const ClientPage = lazy(() => import('./pages/ClientPage.jsx'));
const WaiterPage = lazy(() => import('./pages/WaiterPage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx'));
const DemoPage = lazy(() => import('./pages/DemoPage.jsx'));
const pages = {
  home: Home,
  orders: OrdersPage,
  reception: ReceptionPage,
  staff: StaffPage,
  kitchen: KitchenPage,
  client: ClientPage,
  waiter: WaiterPage,
  booking: BookingPage,
  catalog: CatalogPage,
  demo: DemoPage,
};

function Root() {
  const [location, setLocation] = useState(() =>
    resolvePage(window.location.pathname, window.location.hash),
  );
  useEffect(() => {
    const update = () =>
      setLocation(resolvePage(window.location.pathname, window.location.hash));
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  const Page = pages[location];
  return (
    <Suspense fallback={<p role="status">Carregando...</p>}>
      <Page />
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

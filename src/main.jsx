import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { resolvePage } from './lib/routes.js';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './styles/index.css';

const Home = lazy(() => import('./pages/Home.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const ReceptionPage = lazy(() => import('./pages/ReceptionPage.jsx'));
const GuestStatusPage = lazy(() => import('./pages/GuestStatusPage.jsx'));
const StaffPage = lazy(() => import('./pages/StaffPage.jsx'));
const KitchenPage = lazy(() => import('./pages/KitchenPage.jsx'));
const pages = {
  home: Home,
  orders: OrdersPage,
  reception: ReceptionPage,
  guest: GuestStatusPage,
  staff: StaffPage,
  kitchen: KitchenPage,
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

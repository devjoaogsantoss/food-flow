import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './styles/index.css';

const Home = lazy(() => import('./pages/Home.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const Page = pathname === '/pedidos' ? OrdersPage : Home;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<p role="status">Carregando...</p>}>
      <Page />
    </Suspense>
  </React.StrictMode>,
);

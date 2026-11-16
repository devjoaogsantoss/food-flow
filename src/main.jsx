 
import React from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import OrdersPage from './pages/OrdersPage.jsx';

import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OrdersPage />
  </React.StrictMode>,
);

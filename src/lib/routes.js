export function resolvePage(pathname, hash = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/pedidos') return 'orders';
  if (path === '/recepcao') return 'reception';
  if (path === '/minha-reserva') return 'guest';
  if (path === '/equipe') return 'staff';
  if (path === '/cozinha') return 'kitchen';
  if (hash === '#recepcao') return 'reception';
  if (hash === '#minha-reserva') return 'guest';
  return 'home';
}

export function resolvePage(pathname, hash = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/cliente/reservar') return 'booking';
  if (path === '/cliente/cardapio') return 'catalog';
  if (['/cliente/visita', '/cliente/pedidos', '/cliente/acompanhar', '/cliente/conta'].includes(path)) return 'client';
  if (path === '/testes/reservas') return 'demo';
  if (path === '/admin') return 'staff';
  if (path === '/admin/recepcao') return 'reception';
  if (path === '/admin/salao') return 'waiter';
  if (path === '/admin/cozinha') return 'kitchen';
  if (path === '/pedidos') return 'orders';
  if (path === '/recepcao') return 'reception';
  if (path === '/minha-reserva') return 'client';
  if (path === '/equipe') return 'staff';
  if (path === '/cozinha') return 'kitchen';
  if (hash === '#recepcao') return 'reception';
  if (hash === '#minha-reserva') return 'client';
  return 'home';
}

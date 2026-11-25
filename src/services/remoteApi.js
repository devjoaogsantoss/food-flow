import { createHttpClient } from './httpClient.js';
import { createHttpModules } from './httpModules.js';
import { createUuid } from '../lib/uuid.js';
export const remoteEnabled = typeof window !== 'undefined' && import.meta.env?.MODE !== 'local-demo';
const STAFF_TOKEN = 'food-flow-staff-token';
const CUSTOMER_TOKEN = 'food-flow-customer-token';
const GUEST_TOKENS = 'food-flow-guest-tokens';
const normalize = code => String(code ?? '').trim().toUpperCase();
const verifiedGuests = new Map();
function guestTokens() { try { return JSON.parse(localStorage.getItem(GUEST_TOKENS) ?? '{}'); } catch { return {}; } }
const customerToken = () => localStorage.getItem(CUSTOMER_TOKEN);
export const hasCustomerSession = () => remoteEnabled && Boolean(customerToken());
export function saveGuestSession(code, session) {
  const tokens = guestTokens(); tokens[normalize(code)] = session.token;
  localStorage.setItem(GUEST_TOKENS, JSON.stringify(tokens));
}
function tokenFor(path, method) {
  if (path.startsWith('/auth/') && path !== '/auth/session' && path !== '/auth/logout') return null;
  if (path === '/auth/logout') return customerToken() ?? sessionStorage.getItem(STAFF_TOKEN);
  if (path.startsWith('/customer/')) return customerToken();
  if (path === '/reservations' && method === 'POST') return customerToken();
  const fromPath = /^\/reservations\/([^/]+)/.exec(path)?.[1];
  const code = fromPath ? normalize(decodeURIComponent(fromPath)) : new URLSearchParams(location.search).get('reserva');
  // A tela do responsável usa exclusivamente a sessão daquela reserva.
  if (location.pathname.startsWith('/cliente/')) return guestTokens()[normalize(code)] ?? customerToken();
  if (code && (['/', '/minha-reserva'].includes(location.pathname) || new URLSearchParams(location.search).has('reserva') || !sessionStorage.getItem(STAFF_TOKEN))) return guestTokens()[normalize(code)];
  return sessionStorage.getItem(STAFF_TOKEN);
}
export const request = createHttpClient({ baseUrl: '/api', tokenProvider: tokenFor });
export async function loginGuest(code) {
  code = normalize(code);
  if (guestTokens()[code] && (verifiedGuests.get(code) ?? 0) > Date.now() - 5 * 60000) return;
  const session = await request('POST', '/auth/guest', { body: { code } });
  saveGuestSession(code, session);
  verifiedGuests.set(code, Date.now());
}
export async function loginStaff(registration, password) {
  const session = await request('POST', '/auth/staff', { body: { registration, password } });
  sessionStorage.setItem(STAFF_TOKEN, session.token);
  return session;
}
export async function loginCustomer(email, password) {
  if (!remoteEnabled) throw new Error('Login de cliente requer o servidor Food Flow ativo.');
  const session = await request('POST', '/auth/customer', { body: { email, password } });
  localStorage.setItem(CUSTOMER_TOKEN, session.token);
  return session;
}
export async function registerCustomer(profile) {
  if (!remoteEnabled) throw new Error('Cadastro de cliente requer o servidor Food Flow ativo.');
  const session = await request('POST', '/auth/customer/register', { body: profile });
  localStorage.setItem(CUSTOMER_TOKEN, session.token);
  return session;
}
export async function getCustomerProfile() { if (!remoteEnabled) throw new Error('Conta de cliente requer o servidor Food Flow ativo.'); return request('GET', '/customer/profile'); }
export async function getCustomerReservations() { if (!remoteEnabled) throw new Error('Histórico de cliente requer o servidor Food Flow ativo.'); return request('GET', '/customer/reservations'); }
export async function linkCustomerReservation(code) { if (!remoteEnabled) throw new Error('Vínculo de reserva requer o servidor Food Flow ativo.'); return request('POST', '/customer/reservations/link', { body: { code } }); }
export async function logoutCustomer() {
  try { await request('POST', '/auth/logout'); }
  finally { localStorage.removeItem(CUSTOMER_TOKEN); }
}
export async function logoutStaff() {
  try { await request('POST', '/auth/logout'); }
  finally { sessionStorage.removeItem(STAFF_TOKEN); sessionStorage.removeItem('food-flow-staff-demo'); }
}
const modules = createHttpModules(request);
// Chave mantida após falha de rede para uma repetição do mesmo envio. Não há retry automático.
const keys = new Map();
async function idempotent(name, body, action) {
  const signature = name + JSON.stringify(body);
  const key = keys.get(signature) ?? createUuid(); keys.set(signature, key);
  const result = await action(key);
  keys.delete(signature);
  return result;
}
export const remoteReservations = {
  ...modules.reservations,
  async confirm(body) {
    const result = await idempotent('reservation', body, key => modules.reservations.confirm(body, key));
    saveGuestSession(result.id, result.session);
    const { session, ...reservation } = result;
    return reservation;
  },
  getReservation: async code => { await loginGuest(code); return modules.reservations.getReservation(normalize(code)); },
  cancel: code => modules.reservations.cancel(normalize(code)),
};
export const remoteReception = { ...modules.reception, getGuestStatus: async code => { await loginGuest(code); return modules.reception.getGuestStatus(normalize(code)); } };
export const remoteCheckout = {
  close: (commandId, body) => idempotent('checkout', { commandId, body }, key => modules.checkout.close(commandId, body, key)),
};
export const remoteOrders = { ...modules.orders, createOrder(commandId, items, source, options = {}) {
  return idempotent('order', { commandId, items, source, options }, key => modules.orders.createOrder(commandId, items, source, { ...options, idempotencyKey: key }));
} };

import { createHttpClient } from './httpClient.js';
import { createHttpModules } from './httpModules.js';
export const remoteEnabled = typeof window !== 'undefined' && import.meta.env?.MODE !== 'local-demo';
const STAFF_TOKEN = 'food-flow-staff-token';
const GUEST_TOKENS = 'food-flow-guest-tokens';
const normalize = code => String(code ?? '').trim().toUpperCase();
function guestTokens() { try { return JSON.parse(localStorage.getItem(GUEST_TOKENS) ?? '{}'); } catch { return {}; } }
export function saveGuestSession(code, session) {
  const tokens = guestTokens(); tokens[normalize(code)] = session.token;
  localStorage.setItem(GUEST_TOKENS, JSON.stringify(tokens));
  localStorage.setItem('food-flow-last-reservation', normalize(code));
}
function tokenFor(path, method) {
  if (path.startsWith('/auth/') && path !== '/auth/session' && path !== '/auth/logout') return null;
  if (path === '/reservations' && method === 'POST') return null;
  const fromPath = /^\/reservations\/([^/]+)/.exec(path)?.[1];
  const code = fromPath ? normalize(decodeURIComponent(fromPath)) : new URLSearchParams(location.search).get('reserva');
  // A tela do responsável usa exclusivamente a sessão daquela reserva.
  if (code && (['/', '/minha-reserva'].includes(location.pathname) || new URLSearchParams(location.search).has('reserva') || !sessionStorage.getItem(STAFF_TOKEN))) return guestTokens()[normalize(code)];
  return sessionStorage.getItem(STAFF_TOKEN) ?? guestTokens()[normalize(localStorage.getItem('food-flow-last-reservation'))];
}
export const request = createHttpClient({ baseUrl: '/api', tokenProvider: tokenFor });
export async function loginGuest(code, password) {
  code = normalize(code);
  if (!password && guestTokens()[code]) return;
  if (!password) throw new Error('Informe a senha definida ao reservar.');
  const session = await request('POST', '/auth/guest', { body: { code, password } });
  saveGuestSession(code, session);
}
export async function loginStaff(registration, password) {
  const session = await request('POST', '/auth/staff', { body: { registration, password } });
  sessionStorage.setItem(STAFF_TOKEN, session.token);
  return session;
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
  const key = keys.get(signature) ?? crypto.randomUUID(); keys.set(signature, key);
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
  getReservation: code => modules.reservations.getReservation(normalize(code)),
  cancel: code => modules.reservations.cancel(normalize(code)),
};
export const remoteReception = { ...modules.reception, getGuestStatus: code => modules.reception.getGuestStatus(normalize(code)) };
export const remoteOrders = { ...modules.orders, createOrder(commandId, items, source, options = {}) {
  return idempotent('order', { commandId, items, source, options }, key => modules.orders.createOrder(commandId, items, source, { ...options, idempotencyKey: key }));
} };

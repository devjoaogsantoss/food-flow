// Matrículas demonstrativas fornecidas pelo usuário. Não são autenticação de servidor.
export const staffMembers = {
  '01510041': { role: 'garcom', label: 'Garçom', path: '/pedidos' },
  15152018: { role: 'recepcao', label: 'Recepção', path: '/recepcao' },
  '00589510': { role: 'cozinha', label: 'Cozinha', path: '/cozinha' },
};
export const STAFF_KEY = 'food-flow-staff-demo';
export function getStaff() {
  const registration = sessionStorage.getItem(STAFF_KEY);
  return staffMembers[registration]
    ? { ...staffMembers[registration], registration }
    : null;
}

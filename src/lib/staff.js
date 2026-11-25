// Matrículas demonstrativas fornecidas pelo usuário. Não são autenticação de servidor.
export const staffMembers = {
  '01510041': { role: 'garcom', label: 'Garçom / metre', path: '/admin/salao' },
  15152018: { role: 'recepcao', label: 'Recepção', path: '/admin/recepcao' },
  '00589510': { role: 'cozinha', label: 'Cozinha', path: '/admin/cozinha' },
};
export const STAFF_KEY = 'food-flow-staff-demo';
export function getStaff() {
  const registration = sessionStorage.getItem(STAFF_KEY);
  return staffMembers[registration]
    ? { ...staffMembers[registration], registration }
    : null;
}

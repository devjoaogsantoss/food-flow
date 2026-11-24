// Contratos dos módulos. O servidor deve obter o papel pela sessão autenticada.
// Sem fallback local, retentativa automática ou envio de papel como autorização.
export function createHttpModules(request) {
  const id = (value) => encodeURIComponent(String(value));
  return {
    reservations: {
      getAvailability: (query) => request('GET', '/services/availability', { query }),
      confirm: (body, idempotencyKey) => request('POST', '/reservations', { body, idempotencyKey }),
      getReservation: (code) => request('GET', `/reservations/${id(code)}`),
      cancel: (code) => request('POST', `/reservations/${id(code)}/cancel`),
      joinWaitlist: (body) => request('POST', '/waitlist', { body }),
    },
    reception: {
      getReservations: (query) => request('GET', '/reservations', { query }),
      getTables: () => request('GET', '/tables'),
      getOperations: () => request('GET', '/reception/operations'),
      getGuestStatus: (code) => request('GET', `/reservations/${id(code)}/status`),
      registerArrival: (code, _role, parkingRequired) => request('POST', `/reservations/${id(code)}/check-in`, { body: { parkingRequired } }),
      updateParking: (code, parkingRequired) => request('PATCH', `/reservations/${id(code)}/parking`, { body: { parkingRequired } }),
      registerWait: (code, tableId) => request('POST', `/reservations/${id(code)}/wait`, { body: { tableId } }),
      confirmSeating: (code, tableId) => request('POST', `/reservations/${id(code)}/accommodation`, { body: { tableId } }),
      registerDeparture: (code) => request('POST', `/reservations/${id(code)}/departure`),
      markTableReady: (tableId) => request('POST', `/tables/${id(tableId)}/release`),
      addWaitlistEntry: (body) => request('POST', '/waitlist', { body }),
      updateWaitlistEntry: (entryId, status) => request('PATCH', `/waitlist/${id(entryId)}`, { body: { status } }),
      setBarOccupancy: (occupancy) => request('PUT', '/reception/bar', { body: { occupancy } }),
    },
    orders: {
      getTables: () => request('GET', '/tables'),
      getCommands: () => request('GET', '/checks'),
      getCommand: (commandId) => request('GET', `/checks/${id(commandId)}`),
      createOrder: (commandId, items, source, options = {}) => request('POST', '/orders', {
        body: { commandId, items, source, notes: options.notes }, idempotencyKey: options.idempotencyKey,
      }),
      callWaiter: (commandId, type = 'atendimento') => request('POST', `/checks/${id(commandId)}/calls`, { body: { type } }),
      attendCall: (commandId, callId) => request('PATCH', `/checks/${id(commandId)}/calls/${id(callId)}`, { body: { status: 'atendida' } }),
      deliverRound: (commandId, roundId) => request('PATCH', `/rounds/${id(roundId)}`, { body: { commandId, status: 'entregue' } }),
      markRoundReady: (commandId, roundId) => request('PATCH', `/rounds/${id(roundId)}`, { body: { commandId, status: 'pronto' } }),
      saveTasting: (commandId, body) => request('PATCH', `/checks/${id(commandId)}/tasting`, { body }),
    },
  };
}

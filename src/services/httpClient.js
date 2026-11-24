// Cliente de integração. Não ativado nas telas até existir servidor autenticado.
export function createHttpClient({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  if (!baseUrl || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Configuração HTTP inválida.');
  return async function request(method, path, { query, body, idempotencyKey } = {}) {
    const search = new URLSearchParams(Object.entries(query ?? {}).filter(([, v]) => v != null));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}${search.size ? '?' + search : ''}`, {
        method, credentials: 'same-origin', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 204) return null;
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(new Error(payload?.message ?? `Falha HTTP ${response.status}.`),
        { code: payload?.code ?? 'HTTP_ERROR', status: response.status });
      if (payload === null) throw Object.assign(new Error('Resposta inválida do servidor.'), { code: 'INVALID_RESPONSE' });
      return payload;
    } finally { clearTimeout(timer); }
  };
}

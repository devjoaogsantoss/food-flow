import { useCallback, useEffect, useState } from 'react';
import { remoteEnabled, loginGuest } from '../services/remoteApi.js';
import Brand from '../components/Brand.jsx';
import ExperienceTimeline from '../components/ExperienceTimeline.jsx';
import { ordersApi } from '../services/ordersApi.js';
import { receptionApi } from '../services/receptionApi.js';
import { subscribeState } from '../services/localStore.js';
import '../styles/reception.css';

export default function GuestStatusPage() {
  const initialCode = new URLSearchParams(window.location.search).get('reserva') ?? '';
  const [code, setCode] = useState(initialCode);

  const [searched, setSearched] = useState(initialCode);
  const [status, setStatus] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [command, setCommand] = useState(null);

  const load = useCallback(async (value) => {
    if (!value.trim()) return;
    try {
      const result = await receptionApi.getGuestStatus(value);
      setCommand(result?.canViewCommand ? await ordersApi.getCommand(result.commandId) : null);
      setStatus(result);
      setNotFound(result === null);
      setError('');
    } catch (failure) {
      setError(failure.message);
      setStatus(null);
      setNotFound(false);
    }
  }, []);

  useEffect(() => { if (initialCode) load(initialCode); }, [initialCode, load]);

  // Quando a recepção muda a reserva em outra aba, atualizamos esta página.
  useEffect(() => {
    return subscribeState(() => {
      if (searched) load(searched);
    });
  }, [load, searched]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (remoteEnabled) await loginGuest(code);
      setSearched(code); await load(code);
    } catch (failure) { setError(failure.message); setStatus(null); }
  }

  return (
    <>
      <header className="rc-topbar">
        <a
          href="/"
          aria-label="Food Flow — voltar ao início"
        >
          <Brand />
        </a>
        <span>Minha reserva</span>
      </header>
      <main className="rc-page rc-guest">
        <h1>Acompanhe sua visita</h1>
        <p className="rc-lead">
          {remoteEnabled ? 'Informe o código completo recebido na confirmação. Ele dá acesso a esta reserva.' : 'Consulta demonstrativa neste navegador. Experimente com FF-0001.'}
        </p>
        <form
          className="rc-guest-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="rc-code">Código da reserva</label>
          <input
            id="rc-code"
            required
            value={code}
            placeholder="Ex.: FF-0001"
            onChange={(event) => setCode(event.target.value)}
          />
          <button
            type="submit"
            className="rc-btn"
          >
            Consultar
          </button>
        </form>

        <div
          role="status"
          aria-live="polite"
        >
          {error && <p role="alert">{error}</p>}
          {notFound && (
            <p className="rc-feedback rc-error">
              Não encontramos essa reserva. Confira o código.
            </p>
          )}
          {status && (
            <section
              className={'rc-guest-card rc-guest-' + status.status}
              aria-label="Situação da reserva"
            >
              <p className="rc-meta">
                {status.guestName} · {status.id} ·{' '}
                {status.service.replace(':', 'h')}
              </p>
              <h2>Etapas da visita</h2><ExperienceTimeline reservation={status} command={command} />
              <h2>{status.title}</h2>
              <p>{status.message}</p>
              {status.canViewCommand ? (
                <a
                  className="rc-btn"
                  href={'/pedidos?reserva=' + encodeURIComponent(status.id)}
                >
                  Abrir minha comanda
                </a>
              ) : (
                <p className="rc-hint">Pedidos indisponíveis nesta etapa.</p>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

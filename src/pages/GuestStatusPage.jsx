import { useCallback, useEffect, useState } from 'react';
import Brand from '../components/Brand.jsx';
import { receptionApi } from '../services/receptionApi.js';
import { subscribeState } from '../services/localStore.js';
import '../styles/reception.css';

const steps = ['Reserva', 'Chegada', 'Acomodação'];

export default function GuestStatusPage() {
  const initialCode = new URLSearchParams(window.location.search).get('reserva') ?? '';
  const [code, setCode] = useState(initialCode);
  const [searched, setSearched] = useState(initialCode);
  const [status, setStatus] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (value) => {
    if (!value.trim()) return;
    try {
      const result = await receptionApi.getGuestStatus(value);
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

  function handleSubmit(event) {
    event.preventDefault();
    setSearched(code);
    load(code);
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
        <h1>Acompanhe sua reserva</h1>
        <p className="rc-lead">
          Digite o código da reserva para ver em que etapa você está.
        </p>
        <p>
          Consulta demonstrativa, com dados fictícios deste navegador. Exemplo:
          FF-0001. Não use dados pessoais reais.
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
              <ol className="rc-steps">
                {steps.map((label, index) => (
                  <li
                    key={label}
                    aria-current={
                      status.step === index + 1 ? 'step' : undefined
                    }
                    className={status.step >= index + 1 ? 'rc-step-done' : ''}
                  >
                    {label}
                  </li>
                ))}
              </ol>
              <h2>{status.title}</h2>
              <p>{status.message}</p>
              {status.canOrder ? (
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

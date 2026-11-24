import { useEffect, useState } from 'react';
import { getStaff, staffMembers, STAFF_KEY } from '../lib/staff.js';
import Brand from './Brand.jsx';
import { remoteEnabled, loginStaff, logoutStaff, request } from '../services/remoteApi.js';
import '../styles/menu.css';

export default function StaffAccess({ requiredRole, children }) {
  const [staff, setStaff] = useState(getStaff);
  const [registration, setRegistration] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(remoteEnabled && Boolean(staff));
  useEffect(() => {
    if (!remoteEnabled || !staff) return;
    let active = true;
    request('GET', '/auth/session').then(session => {
      if (active && (session.role !== staff.role || session.principal !== staff.registration)) setStaff(null);
    }).catch(() => { if (active) setStaff(null); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  if (checking) return <p role="status">Verificando sessão…</p>;
  if (staff && (!requiredRole || staff.role === requiredRole)) {
    return (
      <>
        <div className="staff-session">
          <span>
            {staff.label} · matrícula {staff.registration}
          </span>
          <button
            type="button"
            onClick={async () => {
              try { if (remoteEnabled) await logoutStaff(); }
              catch (failure) { setError(failure.message); }
              finally { sessionStorage.removeItem(STAFF_KEY); setStaff(null); }
            }}
          >
            Sair da equipe
          </button>
        </div>
        {children ?? (
          <main className="staff-login">
            <h1>Olá, {staff.label.toLowerCase()}.</h1>
            <a
              className="menu-action"
              href={staff.path}
            >
              Abrir minha área
            </a>
          </main>
        )}
      </>
    );
  }
  return (
    <main className="staff-login">
      <a
        href="/"
        aria-label="Voltar ao site do cliente"
      >
        <Brand />
      </a>
      <p className="menu-code">ÁREA DA EQUIPE</p>
      <h1>Acesso por matrícula</h1>
      <p>Entre para acessar as funções do seu atendimento.</p>
      {staff && (
        <p role="alert">
          Sua matrícula é de {staff.label}.{' '}
          <a href={staff.path}>Abrir minha área</a>. Você não tem acesso a esta
          tela.
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const employee = staffMembers[registration];
          if (!employee) {
            setError('Matrícula não encontrada. Confira os oito dígitos.');
            return;
          }
          if (busy) return;
          setBusy(true); setError('');
          try {
            if (remoteEnabled) {
              const session = await loginStaff(registration, password);
              if (session.role !== employee.role) throw new Error('Perfil incompatível com esta matrícula.');
            }
            sessionStorage.setItem(STAFF_KEY, registration);
            window.location.assign(employee.path);
          } catch (failure) { setError(failure.message); }
          finally { setBusy(false); }
        }}
      >
        <label htmlFor="staff-registration">
          Matrícula
          <input
            id="staff-registration"
            inputMode="numeric"
            autoComplete="off"
            required
            pattern="[0-9]{8}"
            maxLength="8"
            value={registration}
            onChange={(event) =>
              setRegistration(event.target.value.replace(/\D/g, ''))
            }
            placeholder="Digite os 8 dígitos"
          />
        </label>
        {remoteEnabled && <label htmlFor="staff-password">Senha<input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>}
        <button className="menu-action" disabled={busy}>{busy ? 'Entrando…' : 'Entrar na minha área'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p className="menu-description">
        {remoteEnabled ? 'Acesso da equipe com matrícula e senha. Solicite suas credenciais ao responsável pelo sistema.' : 'Modo local de demonstração, sem autenticação de servidor.'}
      </p>
      {!remoteEnabled && <details>
        <summary>Matrículas para testar</summary>
        <ul>
          {Object.entries(staffMembers).map(([id, entry]) => (
            <li key={id}>
              {id} · {entry.label}
            </li>
          ))}
        </ul>
      </details>}
    </main>
  );
}

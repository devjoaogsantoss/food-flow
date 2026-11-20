import { useState } from 'react';
import { getStaff, staffMembers, STAFF_KEY } from '../lib/staff.js';
import Brand from './Brand.jsx';
import '../styles/menu.css';

export default function StaffAccess({ requiredRole, children }) {
  const [staff, setStaff] = useState(getStaff);
  const [registration, setRegistration] = useState('');
  const [error, setError] = useState('');
  if (staff && (!requiredRole || staff.role === requiredRole)) {
    return (
      <>
        <div className="staff-session">
          <span>
            {staff.label} · matrícula {staff.registration}
          </span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(STAFF_KEY);
              setStaff(null);
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
        onSubmit={(event) => {
          event.preventDefault();
          const employee = staffMembers[registration];
          if (!employee) {
            setError('Matrícula não encontrada. Confira os oito dígitos.');
            return;
          }
          sessionStorage.setItem(STAFF_KEY, registration);
          window.location.assign(employee.path);
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
        <button className="menu-action">Entrar na minha área</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p className="menu-description">
        Acesso demonstrativo neste navegador. Matrícula identifica o perfil;
        autenticação real será conectada à API.
      </p>
      <details>
        <summary>Matrículas para testar</summary>
        <ul>
          {Object.entries(staffMembers).map(([id, entry]) => (
            <li key={id}>
              {id} · {entry.label}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}

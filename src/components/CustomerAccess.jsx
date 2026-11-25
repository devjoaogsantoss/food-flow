import { useState } from 'react';
import { loginCustomer, registerCustomer } from '../services/remoteApi.js';

export default function CustomerAccess({ onAuthenticated, error, setError }) {
  const [busy, setBusy] = useState(false);
  async function submit(event, registering) {
    event.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const session = registering
        ? await registerCustomer({ firstName: form.get('firstName'), lastName: form.get('lastName'), age: Number(form.get('age')), cpf: form.get('cpf'), phone: form.get('phone'), email: form.get('email'), password: form.get('password') })
        : await loginCustomer(form.get('email'), form.get('password'));
      await onAuthenticated(session);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="product-surface product-lookup">
    <h2>Acesse seu histórico</h2>
    <p>Entre para ver suas reservas ou crie uma conta para reuni-las.</p>
    <form onSubmit={event => submit(event, false)}>
      <h3>Entrar</h3>
      <label htmlFor="customer-login-email">E-mail<input id="customer-login-email" name="email" type="email" autoComplete="email" required/></label>
      <label htmlFor="customer-login-password">Senha<input id="customer-login-password" name="password" type="password" autoComplete="current-password" required/></label>
      <button className="product-button" disabled={busy}>{busy ? 'Aguarde…' : 'Entrar'}</button>
    </form>
    <details><summary>Criar conta</summary>
      <p>Suas próximas reservas ficarão reunidas no histórico da conta.</p>
      <form onSubmit={event => submit(event, true)}>
        <div className="client-signup-grid">
          <label htmlFor="customer-first-name">Nome<input id="customer-first-name" name="firstName" autoComplete="given-name" minLength="2" maxLength="80" required/></label>
          <label htmlFor="customer-last-name">Sobrenome<input id="customer-last-name" name="lastName" autoComplete="family-name" minLength="2" maxLength="100" required/></label>
          <label htmlFor="customer-age">Idade<input id="customer-age" name="age" type="number" min="18" max="120" required/></label>
          <label htmlFor="customer-cpf">CPF<input id="customer-cpf" name="cpf" inputMode="numeric" autoComplete="off" maxLength="14" placeholder="000.000.000-00" required/></label>
          <label htmlFor="customer-phone">Telefone<input id="customer-phone" name="phone" type="tel" autoComplete="tel" required/></label>
          <label htmlFor="customer-register-email">E-mail<input id="customer-register-email" name="email" type="email" autoComplete="email" required/></label>
          <label htmlFor="customer-register-password">Senha<input id="customer-register-password" name="password" type="password" autoComplete="new-password" minLength="10" maxLength="128" required/><small>Use ao menos 10 caracteres.</small></label>
        </div>
        <button className="product-button" disabled={busy}>{busy ? 'Criando conta…' : 'Criar conta'}</button>
      </form>
    </details>
  </section>;
}

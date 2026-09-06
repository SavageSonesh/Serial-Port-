import { useState, type FormEvent } from 'react';
import { useStore } from '../state/store';

export function Login() {
  const { signIn, storage } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}brand/logo.png`} alt="O Satélite" className="login-logo" />
        <h1>Menu do dia</h1>
        <p className="muted">Entre para editar o menu. {storage.label}.</p>
        <label>
          E-mail
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Palavra-passe
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

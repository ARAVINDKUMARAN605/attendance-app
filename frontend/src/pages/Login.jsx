import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (err) {
      setError(err.message);
      setShake(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="bg-blob b1" />
      <div className="bg-blob b2" />
      <div className="bg-blob b3" />

      <form
        className={`card login-card ${shake ? 'shake' : ''}`}
        onSubmit={handleSubmit}
        onAnimationEnd={(e) => e.target === e.currentTarget && setShake(false)}
      >
        <div className="login-logo">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path className="tick" d="M8.5 15.5l2.5 2.5 4.5-5" />
          </svg>
        </div>
        <h1 className="stagger" style={{ '--i': 1 }}>Attendance System</h1>
        <p className="muted stagger" style={{ '--i': 2 }}>Welcome back! Sign in as admin or student</p>

        <div className="stagger" style={{ '--i': 3 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>

        <div className="stagger" style={{ '--i': 4 }}>
          <label>Password</label>
          <div className="pw-field">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="login-submit stagger" style={{ '--i': 5 }} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" /> Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}
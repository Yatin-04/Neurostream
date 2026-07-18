import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      login(data.access_token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [email, code, login, navigate]);

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass glow-accent rounded-2xl px-10 py-8 text-center">
          <p className="text-neuro-muted">No email provided. Please register first.</p>
          <button onClick={() => navigate('/register')} className="mt-4 rounded-xl bg-neuro-accent px-6 py-2.5 text-sm font-semibold text-white">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className="glass glow-accent relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-glow text-2xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="mt-2 text-sm text-neuro-muted">
            We sent a 6-digit code to <span className="text-neuro-text">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-neuro-danger/10 px-4 py-2.5 text-sm text-neuro-danger ring-1 ring-neuro-danger/20">
              {error}
            </div>
          )}

          <input
            type="text" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code" required maxLength={6} autoComplete="one-time-code"
            className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-center text-2xl tracking-[0.5em] text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
          />

          <button type="submit" disabled={loading || code.length < 6}
            className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20 active:scale-[0.98] disabled:opacity-40">
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}

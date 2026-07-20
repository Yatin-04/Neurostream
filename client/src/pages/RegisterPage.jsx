import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(''); // '', 'checking', 'available', 'taken', 'invalid'
  const [usernameReason, setUsernameReason] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Debounced username checking effect
  useEffect(() => {
    if (!username) {
      setUsernameStatus('');
      setUsernameReason('');
      return;
    }

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameStatus('invalid');
      setUsernameReason('Must be at least 3 characters');
      return;
    }

    const alphanumeric = /^[a-zA-Z0-9_]+$/;
    if (!alphanumeric.test(trimmed)) {
      setUsernameStatus('invalid');
      setUsernameReason('Only letters, numbers, and underscores allowed');
      return;
    }

    setUsernameStatus('checking');
    setUsernameReason('');

    const handler = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
          setUsernameReason(data.reason || 'Already taken');
        }
      } catch (err) {
        console.warn('[Register] Check username failed:', err);
        setUsernameStatus('');
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [username]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { username, email, password });
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div className="wave-container" aria-hidden="true">
        <div className="spherical-wave wave-cyan" />
        <div className="spherical-wave wave-indigo" />
        <div className="spherical-wave wave-magenta" />
      </div>

      <div className="glass glow-accent relative z-10 w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-glow text-3xl font-bold tracking-tight">
            Ba<span className="text-neuro-accent">ud</span>
          </h1>
          <p className="mt-2 text-sm text-neuro-muted">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-neuro-danger/10 px-4 py-2.5 text-sm text-neuro-danger ring-1 ring-neuro-danger/20">
              {error}
            </div>
          )}

          <div className="relative">
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Username" required autoComplete="username"
              className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
            />
            {usernameStatus && (
              <div className="mt-1.5 ml-1 text-xs">
                {usernameStatus === 'checking' && (
                  <span className="text-neuro-muted">Checking availability...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-neuro-success">✓ Username is available</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-neuro-danger">✗ {usernameReason}</span>
                )}
                {usernameStatus === 'invalid' && (
                  <span className="text-neuro-danger">⚠ {usernameReason}</span>
                )}
              </div>
            )}
          </div>

          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required autoComplete="email"
            className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
          />

          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)" required minLength={6} autoComplete="new-password"
            className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
          />

          <button type="submit" disabled={loading || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
            className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20 active:scale-[0.98] disabled:opacity-40">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neuro-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-neuro-accent transition-smooth hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

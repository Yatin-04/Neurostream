import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { usernameOrEmail, password });
      login(data.access_token, data.user);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.email) {
        navigate('/verify-email', { state: { email: err.response.data.email } });
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }, [usernameOrEmail, password, login, navigate]);

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
          <p className="mt-2 text-sm text-neuro-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-neuro-danger/10 px-4 py-2.5 text-sm text-neuro-danger ring-1 ring-neuro-danger/20">
              {error}
            </div>
          )}

          <input
            type="text" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)}
            placeholder="Username or Email" required autoComplete="username"
            className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
          />

          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required autoComplete="current-password"
            className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
          />

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20 active:scale-[0.98] disabled:opacity-40">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-neuro-muted">
          <Link to="/forgot-password" className="transition-smooth hover:text-neuro-accent">
            Forgot password?
          </Link>
          <span>
            Don't have an account?{' '}
            <Link to="/register" className="text-neuro-accent transition-smooth hover:underline">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

import AuthShell from '../components/AuthShell';
import AuthField from '../components/AuthField';

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
    <AuthShell
      title={<>Ba<span className="text-neuro-accent">ud</span></>}
      subtitle="Sign in to your account"
      footer={
        <>
          <Link to="/forgot-password" className="transition-smooth hover:text-neuro-accent">
            Forgot password?
          </Link>
          <span className="mt-2">
            Don't have an account?{' '}
            <Link to="/register" className="text-neuro-accent transition-smooth hover:underline">
              Sign up
            </Link>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="auth-alert error mb-4">{error}</div>}

        <AuthField
          id="usernameOrEmail" label="Username or email" type="text"
          value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder="you@domain.com" required autoComplete="username"
        />

        <AuthField
          id="password" label="Password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" required autoComplete="current-password"
        />

        <button type="submit" disabled={loading} className="btn-resonance">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
}

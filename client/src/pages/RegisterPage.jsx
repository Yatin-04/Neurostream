import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AuthShell from '../components/AuthShell';
import AuthField from '../components/AuthField';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(''); // 'checking', 'available', 'taken', 'invalid'
  const [usernameReason, setUsernameReason] = useState('');
  const navigate = useNavigate();

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('');
      setUsernameReason('');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameReason('Only letters, numbers, and underscores allowed');
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus('checking');
      try {
        const { data } = await api.get(`/auth/check-username?username=${username}`);
        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
          setUsernameReason('Username is already taken');
        }
      } catch (err) {
        setUsernameStatus('');
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    
    if (usernameStatus !== 'available') {
      setError('Please choose a valid and available username');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', { username, email, password });
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, usernameStatus, navigate]);

  const usernameHint = usernameStatus && (
    <div className="mt-1.5 ml-1 text-xs font-mono">
      {usernameStatus === 'checking' && <span className="text-neuro-muted">Checking availability…</span>}
      {usernameStatus === 'available' && <span className="text-neuro-success">✓ Username is available</span>}
      {usernameStatus === 'taken' && <span className="text-neuro-danger">✗ {usernameReason}</span>}
      {usernameStatus === 'invalid' && <span className="text-neuro-danger">⚠ {usernameReason}</span>}
    </div>
  );

  return (
    <AuthShell
      title={<>Ba<span className="text-neuro-accent">ud</span></>}
      subtitle="Create your account"
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="text-neuro-accent transition-smooth hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="auth-alert error mb-4">{error}</div>}

        <AuthField
          id="username" label="Username" type="text"
          value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="jane_doe" required autoComplete="username"
          after={usernameHint}
        />

        <AuthField
          id="email" label="Email" type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com" required autoComplete="email"
        />

        <AuthField
          id="password" label="Password (min 6 chars)" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" required minLength={6} autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
          className="btn-resonance"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthShell>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AuthShell from '../components/AuthShell';
import AuthField from '../components/AuthField';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState(location.state?.email || '');
  const [emailSubmitted, setEmailSubmitted] = useState(!!location.state?.email);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setEmailSubmitted(true);
      setError('');
    }
  };

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resendLoading) return;
    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('Verification code resent. Check your inbox.');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  }, [email, cooldown, resendLoading]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      login(data.access_token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }, [email, code, login, navigate]);

  if (!emailSubmitted) {
    return (
      <AuthShell
        title={
          <div className="flex items-center justify-center gap-3">
            <img src="/favicon.svg" alt="Baud Logo" className="h-10 w-10 drop-shadow-md" />
            <span>Baud</span>
          </div>
        }
        subtitle="Verify your email"
        footer={
          <button onClick={() => navigate('/register')} className="transition-smooth hover:text-neuro-accent">
            Need an account? Register
          </button>
        }
      >
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <AuthField
            id="email" label="Email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com" required autoComplete="email"
          />
          <button type="submit" className="btn-resonance">
            Continue
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        <div className="flex items-center justify-center gap-3">
          <img src="/favicon.svg" alt="Baud Logo" className="h-10 w-10 drop-shadow-md" />
          <span>Baud</span>
        </div>
      }
      subtitle={
        <>
          Verify your email. We sent a 6-digit code to <span className="font-medium text-neuro-text">{email}</span>
          <button onClick={() => setEmailSubmitted(false)} className="ml-2 text-xs text-neuro-accent hover:underline">
            (change)
          </button>
        </>
      }
      footer={
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading || cooldown > 0}
          className="transition-smooth hover:text-neuro-accent disabled:opacity-50 disabled:hover:text-neuro-muted"
        >
          {resendLoading ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive a code? Resend"}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="auth-alert error mb-4">{error}</div>}
        {success && <div className="auth-alert success mb-4">{success}</div>}

        <AuthField
          id="code" label="6-digit code" type="text" code
          value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="000000" required maxLength={6} autoComplete="one-time-code"
        />

        <button type="submit" disabled={loading || code.length < 6} className="btn-resonance">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </AuthShell>
  );
}

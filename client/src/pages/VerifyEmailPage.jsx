import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

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
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setEmailSubmitted(true);
      setError('');
    }
  };

  const handleResend = useCallback(async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('A new verification code has been sent!');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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

  if (!emailSubmitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
        <div className="orb orb-1" aria-hidden="true" />
        <div className="orb orb-2" aria-hidden="true" />

        <div className="glass glow-accent relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-glow text-2xl font-bold tracking-tight">Verify Your Email</h1>
            <p className="mt-2 text-sm text-neuro-muted">
              Enter your email address to continue verification.
            </p>
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email"
              className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
            />
            <button type="submit"
              className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20 active:scale-[0.98]">
              Continue
            </button>
          </form>
          <button onClick={() => navigate('/register')} className="mt-4 w-full text-sm text-neuro-muted hover:text-neuro-accent">
            Need an account? Register
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
            We sent a 6-digit code to <span className="text-neuro-text font-medium">{email}</span>
            <button onClick={() => setEmailSubmitted(false)} className="ml-2 text-xs text-neuro-accent hover:underline">
              (change)
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-neuro-danger/10 px-4 py-2.5 text-sm text-neuro-danger ring-1 ring-neuro-danger/20">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-neuro-success/10 px-4 py-2.5 text-sm text-neuro-success ring-1 ring-neuro-success/20">
              {success}
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

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={handleResend}
            disabled={resendLoading || cooldown > 0}
            className="text-sm text-neuro-muted transition-smooth hover:text-neuro-accent disabled:opacity-50 disabled:hover:text-neuro-muted"
          >
            {resendLoading ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive a code? Resend"}
          </button>
        </div>
      </div>
    </div>
  );
}

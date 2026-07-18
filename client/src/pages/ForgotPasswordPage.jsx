import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('Check your email for the reset code.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleReset = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }, [email, code, newPassword, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className="glass glow-accent relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-glow text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-neuro-muted">
            {step === 'request' ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-neuro-danger/10 px-4 py-2.5 text-sm text-neuro-danger ring-1 ring-neuro-danger/20">
            {error}
          </div>
        )}
        {message && step === 'reset' && (
          <div className="mb-4 rounded-lg bg-neuro-success/10 px-4 py-2.5 text-sm text-neuro-success ring-1 ring-neuro-success/20">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email"
              className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
            />
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 active:scale-[0.98] disabled:opacity-40">
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="text" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code" required maxLength={6} autoComplete="one-time-code"
              className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-center text-2xl tracking-[0.5em] text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
            />
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)" required minLength={6} autoComplete="new-password"
              className="w-full rounded-xl border border-neuro-border bg-neuro-bg/60 px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted outline-none transition-smooth focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20"
            />
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base font-semibold text-white transition-smooth hover:bg-neuro-accent/90 active:scale-[0.98] disabled:opacity-40">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neuro-muted">
          <Link to="/login" className="text-neuro-accent transition-smooth hover:underline">
            ← Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

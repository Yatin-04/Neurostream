import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AuthShell from '../components/AuthShell';
import AuthField from '../components/AuthField';

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
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleReset = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      setMessage('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }, [email, code, newPassword, navigate]);

  return (
    <AuthShell
      title={
        <div className="flex items-center justify-center gap-3">
          <img src="/favicon.svg" alt="Baud Logo" className="h-10 w-10 drop-shadow-md" />
          <span>Baud</span>
        </div>
      }
      subtitle={step === 'request' ? 'Reset password. Enter your email to receive a reset code.' : 'Reset password. Enter the code and your new password.'}
      footer={
        <Link to="/login" className="transition-smooth hover:text-neuro-accent">
          ← Back to sign in
        </Link>
      }
    >
      {error && <div className="auth-alert error mb-4">{error}</div>}
      {message && step === 'reset' && <div className="auth-alert success mb-4">{message}</div>}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <AuthField
            id="email" label="Email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com" required autoComplete="email"
          />
          <button type="submit" disabled={loading} className="btn-resonance">
            {loading ? 'Sending…' : 'Send Reset Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <AuthField
            id="code" label="6-digit code" type="text" code
            value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="000000" required maxLength={6} autoComplete="one-time-code"
          />
          <AuthField
            id="newPassword" label="New password (min 6 chars)" type="password"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••" required minLength={6} autoComplete="new-password"
          />
          <button type="submit" disabled={loading || code.length < 6} className="btn-resonance">
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

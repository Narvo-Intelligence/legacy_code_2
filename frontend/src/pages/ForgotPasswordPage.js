import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeSimple, ArrowLeft, CheckCircle, Warning } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import Clock from '../components/Clock';
import NarvoLogo from '../components/NarvoLogo';

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative bg-background-dark" data-testid="forgot-password-page">
      <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-forest bg-background-dark z-10 shrink-0">
        <div className="flex items-center gap-4">
          <NarvoLogo alt="Narvo" className="w-6 h-6" />
          <div className="font-display text-xl tracking-tight font-bold uppercase text-content">
            NARVO <span className="text-forest font-light mx-2">{'//'}</span> RECOVERY
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 mono-ui text-[12px] text-forest">
          <span className="w-2 h-2 bg-primary animate-pulse" />
          <span>SECURE_CHANNEL: ACTIVE</span>
          <span className="ml-4">LOCAL <Clock /></span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 mono-ui text-[13px] text-forest hover:text-primary transition-colors mb-6"
            data-testid="back-to-auth"
          >
            <ArrowLeft weight="bold" className="w-4 h-4" />
            [BACK_TO_AUTH]
          </Link>

          {sent ? (
            /* Success State */
            <div className="border border-forest bg-background-dark" data-testid="reset-success">
              <div className="p-5 border-b border-forest flex items-center gap-3 bg-primary/5">
                <CheckCircle weight="fill" className="w-6 h-6 text-primary" />
                <h2 className="font-display text-xl font-bold uppercase text-content tracking-tight">
                  RESET_LINK_DISPATCHED
                </h2>
              </div>
              <div className="p-6 md:p-8 space-y-5">
                <p className="mono-ui text-[13px] text-forest leading-relaxed">
                  A password recovery signal has been transmitted to <span className="text-primary font-bold">{email}</span>.
                  Check your inbox and follow the secure link to reset your access code.
                </p>
                <div className="border border-forest/30 bg-surface/10 p-4 space-y-2">
                  <span className="mono-ui text-[11px] text-primary font-bold block">RECOVERY_PROTOCOL:</span>
                  <ul className="space-y-1.5 mono-ui text-[12px] text-forest">
                    <li>01 // Check inbox (and spam folder)</li>
                    <li>02 // Click the secure reset link</li>
                    <li>03 // Set a new access code (min 6 chars)</li>
                    <li>04 // Return to auth terminal and sign in</li>
                  </ul>
                </div>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="w-full h-12 border border-forest text-forest font-display font-bold uppercase hover:bg-surface/20 hover:text-content transition-all"
                  data-testid="resend-btn"
                >
                  [RESEND_SIGNAL]
                </button>
                <Link
                  to="/auth"
                  className="block w-full h-12 bg-primary text-background-dark font-display font-bold uppercase text-center leading-[48px] hover:brightness-110 transition-all"
                  data-testid="return-to-auth"
                >
                  [RETURN_TO_AUTH_TERMINAL]
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="border border-forest bg-background-dark">
              <div className="p-5 border-b border-forest">
                <h2 className="font-display text-2xl font-bold uppercase text-content tracking-tight">
                  Recover Access
                </h2>
                <p className="mono-ui text-[12px] text-forest mt-1">
                  INITIATE_PASSWORD_RECOVERY_SEQUENCE
                </p>
              </div>
              <div className="h-1 w-full bg-surface overflow-hidden border-b border-forest">
                <div className="h-full w-2/3 bg-primary" />
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-surface/50">
                {error && (
                  <div className="border border-red-500/50 bg-red-500/10 p-3 flex items-center gap-2" data-testid="reset-error">
                    <Warning weight="fill" className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-red-400 mono-ui text-[13px]">[ERROR] {error}</span>
                  </div>
                )}

                <p className="mono-ui text-[13px] text-forest leading-relaxed">
                  Enter the operator credential (email) associated with your NARVO account. 
                  A secure recovery link will be transmitted.
                </p>

                <div>
                  <label htmlFor="forgot-email" className="mono-ui text-[12px] text-forest mb-2 block font-bold">
                    Operator Credential
                  </label>
                  <div className="flex items-center border border-forest bg-background-dark h-12 px-4 focus-within:border-primary transition-all">
                    <EnvelopeSimple weight="bold" className="w-5 h-5 text-forest mr-3" aria-hidden />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-content mono-ui text-sm"
                      placeholder="operator@narvo.io"
                      required
                      data-testid="reset-email-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-primary text-background-dark font-display font-bold uppercase tracking-tighter text-lg hover:brightness-110 transition-all flex items-center justify-between px-6 group disabled:opacity-50"
                  data-testid="reset-submit-btn"
                >
                  <span>{loading ? 'Transmitting...' : 'Send Recovery Signal'}</span>
                  {!loading && (
                    <EnvelopeSimple weight="bold" className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </form>

              <div className="border-t border-forest bg-background-dark p-4 text-center">
                <Link
                  to="/auth"
                  className="mono-ui text-[13px] text-forest hover:text-primary transition-colors"
                  data-testid="back-to-signin"
                >
                  [Remember your access code? Sign In]
                </Link>
              </div>
            </div>
          )}

          <p className="mono-ui text-[11px] text-forest/50 text-center mt-6 leading-relaxed">
            Recovery signals are encrypted via AES-256-GCM.<br />
            Links expire after 60 minutes for security.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;

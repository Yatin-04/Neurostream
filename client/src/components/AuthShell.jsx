import ResonanceField from './ResonanceField';

export default function AuthShell({ eyebrow = 'Cognition-aware · P2P mesh', title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <ResonanceField />

      <div className="auth-panel relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-neuro-accent/70">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neuro-text">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-neuro-muted">{subtitle}</p>}
        </div>

        {children}

        {footer && (
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-neuro-muted">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

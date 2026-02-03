import { useState, type FormEvent } from 'react';
import type { GateState } from '../types';
import { copy } from '../copy';
import { hasSupabaseConfig, supabase } from '../../../lib/supabase';

type GateProps = {
  state: GateState;
  onRetry: () => void;
  onReviewSettings?: () => void;
};

export function Gate({ state, onRetry, onReviewSettings }: GateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [devStatus, setDevStatus] = useState('');
  const [devSubmitting, setDevSubmitting] = useState(false);
  const isDev = import.meta.env.DEV;
  const hasDevUserId = Boolean(import.meta.env.VITE_DEV_USER_ID);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig || !supabase) {
      setError(copy.gate.needsLogin.missingConfig);
      return;
    }
    if (!email || !password) {
      setError(copy.gate.needsLogin.missingFields);
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    onRetry();
  };

  const handleDevBypass = () => {
    setDevStatus(copy.gate.devHelper.bypassNotice);
    onRetry();
  };

  const handleDevSignUp = async () => {
    if (!hasSupabaseConfig || !supabase) {
      setDevStatus(copy.gate.devHelper.missingConfig);
      return;
    }
    if (!email || !password) {
      setDevStatus(copy.gate.devHelper.missingFields);
      return;
    }
    setDevSubmitting(true);
    setDevStatus('');
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setDevSubmitting(false);
    if (signUpError) {
      setDevStatus(signUpError.message);
      return;
    }
    if (data.session?.access_token) {
      setDevStatus(copy.gate.devHelper.createdAndSignedIn);
      onRetry();
      return;
    }
    setDevStatus(copy.gate.devHelper.createdNeedsConfirm);
  };

  if (state === 'checking') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.checking.badge}</span>
        <h1>{copy.gate.checking.title}</h1>
        <p>{copy.gate.checking.body}</p>
        <div className="note">{copy.gate.checking.note}</div>
      </div>
    );
  }

  if (state === 'has-salon') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.hasSalon.badge}</span>
        <h1>{copy.gate.hasSalon.title}</h1>
        <p>{copy.gate.hasSalon.body}</p>
        <div className="btn-row">
          <button className="btn primary" type="button">
            {copy.gate.hasSalon.primaryAction}
          </button>
          <button className="btn ghost" type="button" onClick={onReviewSettings}>
            {copy.gate.hasSalon.secondaryAction}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.error.badge}</span>
        <h1>{copy.gate.error.title}</h1>
        <p>{copy.gate.error.body}</p>
        <div className="btn-row">
          <button className="btn primary" type="button" onClick={onRetry}>
            {copy.gate.error.primaryAction}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'needs-login') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.needsLogin.badge}</span>
        <h1>{copy.gate.needsLogin.title}</h1>
        <p>{copy.gate.needsLogin.body}</p>
        <form className="panel" style={{ marginTop: 16 }} onSubmit={handleLogin}>
          <label className="field">
            <span className="label">{copy.gate.needsLogin.emailLabel}</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{copy.gate.needsLogin.passwordLabel}</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="banner">{error}</div>}
          <div className="btn-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? copy.gate.needsLogin.signingIn : copy.gate.needsLogin.signIn}
            </button>
            <button className="btn ghost" type="button" onClick={onRetry}>
              {copy.gate.needsLogin.secondaryAction}
            </button>
          </div>
        </form>
        {isDev && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="badge">{copy.gate.devHelper.badge}</div>
            <h2>{copy.gate.devHelper.title}</h2>
            <p>{copy.gate.devHelper.body}</p>
            <div className="btn-row">
              {hasDevUserId && (
                <button className="btn ghost" type="button" onClick={handleDevBypass}>
                  {copy.gate.devHelper.useBypass}
                </button>
              )}
              <button
                className="btn primary"
                type="button"
                onClick={handleDevSignUp}
                disabled={devSubmitting}
              >
                {devSubmitting ? copy.gate.devHelper.creating : copy.gate.devHelper.createUser}
              </button>
            </div>
            {devStatus && <div className="note">{devStatus}</div>}
          </div>
        )}
      </div>
    );
  }

  return null;
}

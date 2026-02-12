import { useEffect, useState } from 'react';
import { signInWithPassword, signOut } from '../../../lib/auth';
import { Button, Card, Badge, Input, Stack } from '@nemsalon/ui';
import { getSalonSlugFromHostname, getSalonSlugFromPath } from '../../../lib/public-url';
import { getCopy } from '../../../i18n';
import '../auth.css';

type AuthMode = 'login' | 'register';

interface UnifiedLoginProps {
  onLoginSuccess: () => void;
}

export function UnifiedLogin({ onLoginSuccess }: UnifiedLoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [salonSlug, setSalonSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const copy = getCopy().auth;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugFromQuery = params.get('salon');
    const slugFromPath = getSalonSlugFromPath(window.location.pathname);
    const slugFromHost = getSalonSlugFromHostname(window.location.hostname);
    const resolved = slugFromQuery || slugFromPath || slugFromHost || '';
    setSalonSlug(resolved);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPassword(email, password);
      if (!result.ok) {
        setError(copy.errors.invalidCredentials);
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError(copy.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role: 'customer',
          salonSlug: salonSlug || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ message: copy.errors.registrationFailed }));
        if (data.details?.fieldErrors) {
          const fieldErrors = Object.entries(data.details.fieldErrors)
            .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
            .join('; ');
          setError(fieldErrors || data.message || copy.errors.registrationFailed);
        } else {
          setError(data.message || data.error || copy.errors.registrationFailed);
        }
        return;
      }

      const loginResult = await signInWithPassword(email, password);
      if (!loginResult.ok) {
        setError(copy.errors.autoLoginFailed);
        setMode('login');
        return;
      }
      onLoginSuccess();
    } catch (err) {
      setError(copy.errors.registrationFailedRetry);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="auth-card">
      <Badge>{mode === 'login' ? copy.badgeLogin : copy.badgeRegister}</Badge>
      <h1>{copy.title}</h1>
      <p>{mode === 'login' ? copy.loginSubtitle : copy.registerSubtitle}</p>

      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <Input
            label={copy.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            data-testid="login-email"
          />

          <Input
            label={copy.passwordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            data-testid="login-password"
          />

          {error && (
            <Card variant="outlined" className="auth-error-card">
              <p data-testid="auth-error" className="auth-error-text">
                {error}
              </p>
            </Card>
          )}

          <Stack direction="row" gap="md" className="auth-actions">
            <Button
              variant="primary"
              size="md"
              onClick={handleLogin}
              isLoading={loading}
              fullWidth
              data-testid="login-submit"
            >
              {loading ? copy.signingIn : copy.signIn}
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <Input
            label={copy.nameLabel}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            fullWidth
            data-testid="register-name"
          />

          <Input
            label={copy.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            data-testid="register-email"
          />

          <Input
            label={copy.passwordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            fullWidth
            hint={copy.passwordHint}
            data-testid="register-password"
          />
          {!salonSlug && (
            <Input
              label={copy.salonSlugLabel}
              type="text"
              value={salonSlug}
              onChange={(e) => setSalonSlug(e.target.value)}
              required
              fullWidth
              hint={copy.salonSlugHint}
              data-testid="register-salon-slug"
            />
          )}

          {error && (
            <Card variant="outlined" className="auth-error-card">
              <p data-testid="auth-error" className="auth-error-text">
                {error}
              </p>
            </Card>
          )}

          {successMessage && (
            <Card variant="outlined" className="auth-success-card">
              <p className="auth-success-text">{successMessage}</p>
            </Card>
          )}

          <Stack direction="row" gap="md" className="auth-actions">
            <Button
              variant="primary"
              size="md"
              onClick={handleRegister}
              isLoading={loading}
              fullWidth
              data-testid="register-submit"
            >
              {loading ? copy.creatingAccount : copy.createAccount}
            </Button>
          </Stack>
        </form>
      )}

      <div className="auth-switch">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setSuccessMessage('');
          }}
          data-testid="auth-mode-toggle"
        >
          {mode === 'login' ? copy.switchToRegister : copy.switchToLogin}
        </Button>
      </div>
    </Card>
  );
}

export function LogoutButton({ onLogout }: { onLogout?: () => void }) {
  const [loading, setLoading] = useState(false);
  const copy = getCopy().auth;

  const handleLogout = async () => {
    setLoading(true);

    await signOut();

    onLogout?.();
    window.location.href = '/login';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      isLoading={loading}
      title={copy.logoutTitle}
    >
      {loading ? copy.loggingOut : copy.logoutLabel}
    </Button>
  );
}

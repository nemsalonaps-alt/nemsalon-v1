import { useEffect, useState } from 'react';
import { getSalonSlugFromHostname, getSalonSlugFromPath } from '../../../lib/public-url';
import { getCopy } from '../../../i18n';
import '../portal.css';

export function CustomerRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [salonSlug, setSalonSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const c = getCopy().customerRegister;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugFromQuery = params.get('salon');
    const slugFromPath = getSalonSlugFromPath(window.location.pathname);
    const slugFromHost = getSalonSlugFromHostname(window.location.hostname);
    const resolved = slugFromQuery || slugFromPath || slugFromHost || '';
    setSalonSlug(resolved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!salonSlug) {
      setError(c.errorNoSalon);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: 'customer',
          salonSlug,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.message ?? c.errorGeneric);
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(c.errorGeneric);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="cp-register-page">
        <div className="cp-register-card cp-register-card-center">
          <div className="cp-register-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="cp-register-title">{c.successTitle}</h1>
          <p className="cp-register-subtitle">{c.successBody}</p>
          <a href="/login?role=customer" className="cp-primary-button cp-primary-button-full">
            {c.loginCta}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-register-page">
      <div className="cp-register-card">
        <h1 className="cp-register-title">{c.title}</h1>
        <p className="cp-register-subtitle">{c.subtitle}</p>

        {error && (
          <div data-testid="customer-error" className="cp-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cp-form">
          {!salonSlug && (
            <div>
              <label htmlFor="salon" className="cp-field-label">
                {c.salonLabel}
              </label>
              <input
                type="text"
                id="salon"
                value={salonSlug}
                onChange={(e) => setSalonSlug(e.target.value)}
                className="cp-input"
                placeholder={c.salonPlaceholder}
                required
                data-testid="customer-salon-slug"
              />
            </div>
          )}
          <div>
            <label htmlFor="name" className="cp-field-label">
              {c.nameLabel}
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="cp-input"
              required
              minLength={2}
              data-testid="customer-name-input"
            />
          </div>

          <div>
            <label htmlFor="email" className="cp-field-label">
              {c.emailLabel}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="cp-input"
              required
              data-testid="customer-email-input"
            />
          </div>

          <div>
            <label htmlFor="phone" className="cp-field-label">
              {c.phoneLabel}
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="cp-input"
              data-testid="customer-phone-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="cp-field-label">
              {c.passwordLabel}
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="cp-input"
              required
              minLength={8}
              data-testid="customer-password-input"
            />
            <p className="cp-hint">{c.passwordHint}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cp-primary-button cp-primary-button-full"
            data-testid="customer-register-submit"
          >
            {loading ? c.submitting : c.submit}
          </button>
        </form>

        <p className="cp-login-row">
          {c.loginPrompt}{' '}
          <a href="/login?role=customer" className="cp-login-link">
            {c.loginLink}
          </a>
        </p>
      </div>
    </div>
  );
}

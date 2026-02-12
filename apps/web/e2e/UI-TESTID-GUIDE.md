# Guide: Tilføj Data-Testid til UI Komponenter

Dette dokument beskriver hvordan du tilføjer stabile test-hooks (data-testid) til UI komponenter så Playwright tests kan fange fejl pålideligt.

## Hvorfor Data-Testid?

**Problemet:**

- CSS klasser ændrer sig ofte (`.auth-error-text` → `.error-text` → `.text-red-600`)
- UI tekst er ustabil (i18n nøgle vs oversat tekst vs fallback)
- Tests bryder når design ændres

**Løsningen:**

- Brug `data-testid` attributter der er stabile og semantiske
- Tests fokuserer på funktionalitet, ikke styling
- UI kan redesignes uden at bryde tests

## Standard Test IDs

### 1. Error Outlets (MEST VIGTIGE)

Disse SKAL findes på alle fejlvisninger:

```tsx
// Auth/Login fejl
{
  error && (
    <div data-testid="auth-error" className="error-message">
      {error}
    </div>
  );
}

// Booking fejl
{
  error && (
    <div data-testid="booking-error" className="error-message">
      {error}
    </div>
  );
}

// Customer fejl
{
  error && (
    <div data-testid="customer-error" className="error-message">
      {error}
    </div>
  );
}

// Staff fejl
{
  error && (
    <div data-testid="staff-error" className="error-message">
      {error}
    </div>
  );
}

// Service fejl
{
  error && (
    <div data-testid="service-error" className="error-message">
      {error}
    </div>
  );
}

// Settings fejl
{
  error && (
    <div data-testid="settings-error" className="error-message">
      {error}
    </div>
  );
}

// Generelle fejl
{
  error && (
    <div data-testid="error-message" className="error-message">
      {error}
    </div>
  );
}

// Form field fejl
{
  fieldError && (
    <span data-testid="form-error" className="field-error">
      {fieldError}
    </span>
  );
}

// API fejl
{
  apiError && (
    <div data-testid="api-error" className="api-error">
      {apiError}
    </div>
  );
}
```

### 2. Input Fields

```tsx
// Login form
<input data-testid="login-email" type="email" {...props} />
<input data-testid="login-password" type="password" {...props} />
<button data-testid="login-submit" type="submit">Login</button>

// Registration form
<input data-testid="register-name" type="text" {...props} />
<input data-testid="register-email" type="email" {...props} />
<input data-testid="register-password" type="password" {...props} />
<button data-testid="register-submit" type="submit">Opret konto</button>

// Customer form
<input data-testid="customer-name-input" type="text" {...props} />
<input data-testid="customer-email-input" type="email" {...props} />
<input data-testid="customer-phone-input" type="tel" {...props} />
<button data-testid="save-customer-button" type="submit">Gem</button>

// Staff form
<input data-testid="staff-name-input" type="text" {...props} />
<input data-testid="staff-email-input" type="email" {...props} />
<select data-testid="staff-role-select" {...props} />
<button data-testid="save-staff-button" type="submit">Gem</button>

// Service form
<input data-testid="service-name-input" type="text" {...props} />
<input data-testid="service-duration-input" type="number" {...props} />
<input data-testid="service-price-input" type="number" {...props} />
<button data-testid="save-service-button" type="submit">Gem</button>

// Booking form
<select data-testid="booking-service-select" {...props} />
<select data-testid="booking-staff-select" {...props} />
<select data-testid="booking-customer-select" {...props} />
<input data-testid="booking-date-input" type="date" {...props} />
<input data-testid="booking-time-input" type="time" {...props} />
<button data-testid="create-booking-button" type="submit">Opret booking</button>
```

### 3. Navigation & Layout

```tsx
// Page titles
<h1 data-testid="owner-salon-title">{salonName}</h1>
<h1 data-testid="staff-greeting">Hej {staffName}</h1>
<h1 data-testid="customer-portal-title">Mine Bookinger</h1>
<h1 data-testid="platform-admin-title">Platform Admin</h1>

// Navigation tabs
<button data-testid="nav-calendar">Kalender</button>
<button data-testid="nav-bookings">Bookinger</button>
<button data-testid="nav-settings">Indstillinger</button>
<button data-testid="nav-customers">Kunder</button>
<button data-testid="nav-staff">Medarbejdere</button>
<button data-testid="nav-services">Services</button>

// Settings tabs
<button data-testid="settings-general-tab">Generelt</button>
<button data-testid="settings-hours-tab">Åbningstider</button>
<button data-testid="settings-staff-tab">Medarbejdere</button>
<button data-testid="settings-services-tab">Services</button>
<button data-testid="settings-customers-tab">Kunder</button>
```

### 4. Action Buttons

```tsx
// Add buttons
<button data-testid="add-staff-button">Tilføj medarbejder</button>
<button data-testid="add-customer-button">Tilføj kunde</button>
<button data-testid="add-service-button">Tilføj service</button>
<button data-testid="add-booking-button">Ny booking</button>

// Edit buttons
<button data-testid="edit-staff-button">Rediger</button>
<button data-testid="edit-customer-button">Rediger</button>
<button data-testid="edit-service-button">Rediger</button>

// Delete buttons
<button data-testid="delete-staff-button">Slet</button>
<button data-testid="delete-customer-button">Slet</button>
<button data-testid="delete-service-button">Slet</button>
<button data-testid="delete-booking-button">Annuller</button>

// Save buttons
<button data-testid="save-button">Gem</button>
<button data-testid="save-staff-button">Gem medarbejder</button>
<button data-testid="save-customer-button">Gem kunde</button>
<button data-testid="save-service-button">Gem service</button>
<button data-testid="save-settings-button">Gem indstillinger</button>

// Cancel buttons
<button data-testid="cancel-button">Fortryd</button>
<button data-testid="close-button">Luk</button>
```

### 5. Lists & Tables

```tsx
// List containers
<ul data-testid="staff-list">
  {staff.map(s => (
    <li key={s.id} data-testid={`staff-item-${s.id}`}>{s.name}</li>
  ))}
</ul>

<ul data-testid="customer-list">
  {customers.map(c => (
    <li key={c.id} data-testid={`customer-item-${c.id}`}>{c.name}</li>
  ))}
</ul>

<ul data-testid="service-list">
  {services.map(s => (
    <li key={s.id} data-testid={`service-item-${s.id}`}>{s.name}</li>
  ))}
</ul>

<ul data-testid="booking-list">
  {bookings.map(b => (
    <li key={b.id} data-testid={`booking-item-${b.id}`}>
      {/* booking details */}
    </li>
  ))}
</ul>

// Empty states
<div data-testid="empty-staff">Ingen medarbejdere endnu</div>
<div data-testid="empty-customers">Ingen kunder endnu</div>
<div data-testid="empty-services">Ingen services endnu</div>
<div data-testid="empty-bookings">Ingen bookinger endnu</div>
```

### 6. Loading & Status

```tsx
// Loading indicators
<div data-testid="loading">Indlæser...</div>
<div data-testid="loading-spinner" className="spinner" />
<div data-testid="skeleton-loader">Loading skeleton</div>

// Success messages
<div data-testid="success-message">Gemt!</div>
<div data-testid="booking-created">Booking oprettet!</div>
<div data-testid="customer-saved">Kunde gemt!</div>

// Toast notifications
<div data-testid="toast-success">Handling gennemført</div>
<div data-testid="toast-error">Der opstod en fejl</div>
<div data-testid="toast-warning">Advarsel</div>
```

### 7. Modal & Dialogs

```tsx
// Modal containers
<div data-testid="modal-overlay">
  <div data-testid="modal-content">
    <button data-testid="modal-close">Luk</button>
    {/* modal content */}
  </div>
</div>

// Confirmation dialogs
<div data-testid="confirm-dialog">
  <p data-testid="confirm-message">Er du sikker?</p>
  <button data-testid="confirm-yes">Ja</button>
  <button data-testid="confirm-no">Nej</button>
</div>
```

## Komplet Eksempel: UnifiedLogin.tsx

```tsx
export function UnifiedLogin({ onLoginSuccess }: UnifiedLoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const copy = getCopy().auth;

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

  return (
    <Card className="auth-card">
      <Badge>{mode === 'login' ? copy.badgeLogin : copy.badgeRegister}</Badge>
      <h1>{copy.title}</h1>

      {/* STABILT ERROR OUTLET */}
      {error && (
        <Card variant="outlined" className="auth-error-card">
          <p data-testid="auth-error" className="auth-error-text">
            {error}
          </p>
        </Card>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <Input
            data-testid="login-email"
            label={copy.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <Input
            data-testid="login-password"
            label={copy.passwordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />

          <Button
            data-testid="login-submit"
            variant="primary"
            size="md"
            type="submit"
            isLoading={loading}
            fullWidth
          >
            {loading ? copy.signingIn : copy.signIn}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <Input
            data-testid="register-name"
            label={copy.nameLabel}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          {/* ... email, password inputs med data-testid */}

          <Button
            data-testid="register-submit"
            variant="primary"
            size="md"
            type="submit"
            isLoading={loading}
            fullWidth
          >
            {loading ? copy.creatingAccount : copy.createAccount}
          </Button>
        </form>
      )}

      <div className="auth-switch">
        <Button
          data-testid="auth-mode-toggle"
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? copy.switchToRegister : copy.switchToLogin}
        </Button>
      </div>
    </Card>
  );
}
```

## Komplet Eksempel: CustomerRegister.tsx

```tsx
export function CustomerRegister() {
  const [formData, setFormData] = useState({...});
  const [error, setError] = useState<string | null>(null);
  const c = getCopy().customerRegister;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/v1/auth/register', {...});

      if (!response.ok) {
        const payload = await response.json();
        setError(payload?.message ?? c.errorGeneric);
        return;
      }

      setSuccess(true);
    } catch {
      setError(c.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cp-register-page">
      <div className="cp-register-card">
        <h1 className="cp-register-title">{c.title}</h1>

        {/* STABILT ERROR OUTLET */}
        {error && (
          <div data-testid="customer-error" className="cp-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cp-form">
          <input
            data-testid="customer-name-input"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="cp-input"
            required
            minLength={2}
          />

          <input
            data-testid="customer-email-input"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="cp-input"
            required
          />

          <input
            data-testid="customer-phone-input"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="cp-input"
          />

          <input
            data-testid="customer-password-input"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="cp-input"
            required
            minLength={8}
          />

          <button
            data-testid="register-submit-button"
            type="submit"
            disabled={loading}
            className="cp-primary-button"
          >
            {loading ? c.submitting : c.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Naming Konventioner

### 1. Format

```
{context}-{element}-{action}
```

Eksempler:

- `auth-error`
- `login-email`
- `login-submit`
- `customer-name-input`
- `save-customer-button`
- `booking-list`
- `booking-item-123`

### 2. Kontekster

- `auth` - Authentication (login, register)
- `login` - Login specifik
- `register` - Registration specifik
- `customer` - Customer management
- `staff` - Staff management
- `service` - Services management
- `booking` - Bookings
- `settings` - Salon settings
- `nav` - Navigation

### 3. Elementer

- `error` - Fejlmeddelelse
- `input` - Input felt
- `select` - Dropdown
- `button` - Knap
- `list` - Liste container
- `item` - List item
- `form` - Formular
- `modal` - Modal/dialog
- `tab` - Navigation tab
- `loading` - Loading indicator

### 4. Actions

- `submit` - Form submit
- `save` - Gem action
- `delete` - Slet action
- `edit` - Rediger action
- `add` - Tilføj action
- `cancel` - Fortryd action
- `close` - Luk action
- `toggle` - Toggle action

## Playwright Test Eksempel

Med data-testid kan tests være stabile:

```typescript
test('viser fejl ved forkert password', async ({ page }) => {
  await page.goto('/login');

  // Fyld formular med stabile selectors
  await page.getByTestId('login-email').fill('dev-owner@nemsalon.test');
  await page.getByTestId('login-password').fill('forkert-password');
  await page.getByTestId('login-submit').click();

  // Verificer fejl med stabilt outlet
  const errorBox = page.getByTestId('auth-error');
  await expect(errorBox).toBeVisible();

  // Matcher mod både i18n nøgle og oversat tekst
  const errorText = await errorBox.textContent();
  expect(
    matchesErrorKey(errorText, 'unauthorized') || errorText.toLowerCase().includes('forkert'),
  ).toBe(true);
});
```

## Checklist for Nye Komponenter

Når du tilføjer fejlvisning i en komponent:

- [ ] Tilføj `data-testid="{context}-error"` på fejl container
- [ ] Tilføj `data-testid` på alle input felter
- [ ] Tilføj `data-testid` på submit/action knapper
- [ ] Tilføj `data-testid` på list items (hvis relevant)
- [ ] Tilføj `data-testid="empty-{context}"` på empty states
- [ ] Tilføj `data-testid="loading"` på loading states
- [ ] Test at data-testid findes i DOM med browser dev tools
- [ ] Opdater Playwright tests til at bruge data-testid

## Ofte Stillede Spørgsmål

**Q: Skal jeg bruge data-testid på alle elementer?**
A: Nej, kun på elementer der skal testes. Fokus på:

- Fejl outlets (MEST VIGTIGE)
- Input felter
- Action knapper
- Loading states
- Empty states

**Q: Hvad hvis en komponent har flere fejl outlets?**
A: Brug specifikke kontekster:

```tsx
<div data-testid="form-error">{fieldError}</div>
<div data-testid="api-error">{apiError}</div>
```

**Q: Kan jeg bruge data-testid sammen med Tailwind?**
A: Ja, det er bare et HTML attribut:

```tsx
<div data-testid="auth-error" className="text-red-600 p-4">
  {error}
</div>
```

**Q: Skal data-testid være unikke?**
A: Ja, inden for samme kontekst. Men du kan have:

- `login-email` (login form)
- `customer-email-input` (customer form)
- `staff-email-input` (staff form)

**Q: Hvad hvis jeg har en liste med mange items?**
A: Brug dynamiske IDs:

```tsx
<li data-testid={`booking-item-${booking.id}`}>
```

## Vigtige Filer at Opdatere

Prioriter at tilføje data-testid til disse filer:

1. **Auth komponenter** (HØJEST PRIORITET)
   - `UnifiedLogin.tsx` - `data-testid="auth-error"`
   - `CustomerRegister.tsx` - `data-testid="customer-error"`

2. **Booking komponenter**
   - Booking create form
   - Booking cancel/reschedule dialogs

3. **Settings komponenter**
   - Salon info form
   - Business hours form

4. **Staff/Customer komponenter**
   - Create/edit forms
   - List views

5. **Service komponenter**
   - Service create/edit form

## Næste Skridt

1. Tilføj `data-testid="auth-error"` til UnifiedLogin.tsx
2. Tilføj `data-testid="customer-error"` til CustomerRegister.tsx
3. Kør Playwright tests for at verificere de virker
4. Fortsæt med resten af komponenterne

## Support

Hvis du er i tvivl om hvilket data-testid du skal bruge:

1. Se på fejl-matrix i `ERROR-MATRIX.md`
2. Se på eksisterende tests i `auth-errors.spec.ts`
3. Spørg i team chat

**Husk:** Bedre at tilføje for mange data-testid end for få. De koster ingenting i produktion men gør tests meget mere stabile.

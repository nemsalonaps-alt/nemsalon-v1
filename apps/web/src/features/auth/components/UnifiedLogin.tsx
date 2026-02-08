import { useState } from 'react';
import { signInWithPassword, signOut } from '../../../lib/auth';

type LoginRole = 'owner' | 'staff' | 'customer';

interface UnifiedLoginProps {
  onLoginSuccess: () => void;
}

export function UnifiedLogin({ onLoginSuccess }: UnifiedLoginProps) {
  const [role, setRole] = useState<LoginRole>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'owner' || role === 'customer') {
        // Email + password login via Supabase
        const result = await signInWithPassword(email, password);
        if (!result.ok) {
          setError('Invalid email or password');
          return;
        }
      } else {
        // Staff PIN login via custom API (token set in httpOnly cookie)
        const response = await fetch('/v1/auth/staff/login-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, pin }),
          credentials: 'include' // Important: send/receive cookies
        });
        
        if (!response.ok) {
          setError('Invalid email or PIN');
          return;
        }
        
        // Token is in httpOnly cookie, not response body
        const data = await response.json();
        localStorage.setItem('staff_id', data.staffId);
      }
      
      onLoginSuccess();
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleTabs: { id: LoginRole; label: string }[] = [
    { id: 'owner', label: 'Salon Owner' },
    { id: 'staff', label: 'Staff' },
    { id: 'customer', label: 'Customer' }
  ];

  return (
    <div className="panel" style={{ maxWidth: 400, margin: '40px auto' }}>
      <span className="badge">Login</span>
      <h1>Welcome to Nemsalon</h1>
      <p>Select your role to continue</p>

      <div className="role-tabs" style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 16
      }}>
        {roleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn ${role === tab.id ? 'primary' : 'ghost'}`}
            onClick={() => {
              setRole(tab.id);
              setError('');
            }}
            style={{ flex: 1 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {role === 'staff' ? (
          <label className="field">
            <span className="label">PIN Code</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-6 digits"
              required
            />
          </label>
        ) : (
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}

        {error && (
          <div className="banner" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 24 }}>
          <button 
            className="btn primary" 
            type="submit"
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>

      {role === 'staff' && (
        <div className="note" style={{ marginTop: 16, textAlign: 'center' }}>
          First time? Check your email for an invitation link to set up your PIN.
        </div>
      )}

      {role === 'customer' && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/register" className="link">Create an account</a>
        </div>
      )}
    </div>
  );
}

// Logout button component for use in consoles
export function LogoutButton({ onLogout }: { onLogout?: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    
    // Call logout endpoint - cookie will be cleared server-side
    try {
      await fetch('/v1/auth/staff/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      // Ignore errors
    }
    
    // Clear localStorage items
    localStorage.removeItem('staff_id');
    
    // Sign out from Supabase
    await signOut();
    
    onLogout?.();
    window.location.href = '/login';
  };

  return (
    <button 
      className="btn ghost" 
      onClick={handleLogout}
      disabled={loading}
      title="Log out"
    >
      {loading ? '...' : 'Logout'}
    </button>
  );
}

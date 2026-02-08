import { useState } from 'react';

interface StaffPinSetupProps {
  inviteToken: string;
  onSetupComplete: () => void;
}

export function StaffPinSetup({ inviteToken, onSetupComplete }: StaffPinSetupProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    if (pin.length < 4 || pin.length > 6) {
      setError('PIN must be 4-6 digits');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/v1/auth/staff/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, pin })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to set PIN. Invitation may be expired.');
        return;
      }
      
      setSuccess(true);
      setTimeout(onSetupComplete, 2000);
    } catch (err) {
      setError('Failed to set PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="panel" style={{ maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
        <span className="badge" style={{ background: 'var(--success)' }}>Success</span>
        <h1>PIN Set Successfully!</h1>
        <p>Your PIN has been set. You can now log in with your email and PIN.</p>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 400, margin: '40px auto' }}>
      <span className="badge">Staff Setup</span>
      <h1>Set Your PIN</h1>
      <p>Create a 4-6 digit PIN to access your staff account.</p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">PIN (4-6 digits)</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            minLength={4}
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            required
          />
        </label>

        <label className="field">
          <span className="label">Confirm PIN</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            minLength={4}
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="••••"
            required
          />
        </label>

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
            {loading ? 'Setting PIN...' : 'Set PIN'}
          </button>
        </div>
      </form>

      <div className="note" style={{ marginTop: 16 }}>
        Your PIN should be easy to remember but hard for others to guess. 
        Do not use simple sequences like 1234.
      </div>
    </div>
  );
}

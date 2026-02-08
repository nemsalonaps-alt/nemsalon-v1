import { ConsoleRouter } from './features/console/ConsoleRouter';
import { PublicBookingApp } from './features/public-booking/PublicBookingApp';
import { Portal as CustomerPortal, Register as CustomerRegister } from './features/customer-portal';
import { UnifiedLogin } from './features/auth/components/UnifiedLogin';
import { StaffPinSetup } from './features/auth/components/StaffPinSetup';

export function WebApp() {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/book')) {
      return <PublicBookingApp />;
    }
    if (path === '/portal') {
      return <CustomerPortal />;
    }
    if (path === '/register') {
      return <CustomerRegister />;
    }
    if (path === '/login') {
      return (
        <div className="app">
          <UnifiedLogin onLoginSuccess={() => window.location.href = '/'} />
        </div>
      );
    }
    if (path.startsWith('/staff/setup-pin')) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        return (
          <div className="app">
            <StaffPinSetup 
              inviteToken={token} 
              onSetupComplete={() => window.location.href = '/login'} 
            />
          </div>
        );
      }
      return (
        <div className="app">
          <div className="panel" style={{ maxWidth: 400, margin: '40px auto' }}>
            <h1>Invalid Link</h1>
            <p>This invitation link is invalid or has expired.</p>
          </div>
        </div>
      );
    }
  }
  return <ConsoleRouter />;
}

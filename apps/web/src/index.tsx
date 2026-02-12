import { ConsoleRouter } from './features/console/ConsoleRouter';
import { PublicBookingApp } from './features/public-booking/PublicBookingApp';
import { Portal as CustomerPortal, Register as CustomerRegister } from './features/customer-portal';
import { UnifiedLogin } from './features/auth/components/UnifiedLogin';

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
  }
  return <ConsoleRouter />;
}

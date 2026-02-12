// Payment State Components - Empty states, error states, and status indicators

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Inbox,
  AlertCircle,
  Search,
  RefreshCcw,
  DollarSign,
  ShieldAlert,
  FileX,
  CreditCard,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Wallet,
} from 'lucide-react';

// ==================== EMPTY STATES ====================

interface EmptyStateProps {
  type:
    | 'transactions'
    | 'refunds'
    | 'disputes'
    | 'payment-methods'
    | 'subscriptions'
    | 'analytics'
    | 'search';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PaymentEmptyState({ type, title, description, action }: EmptyStateProps) {
  const configs = {
    transactions: {
      icon: DollarSign,
      defaultTitle: 'No Transactions Yet',
      defaultDescription:
        'When customers make payments, they will appear here. Create a booking to get started.',
    },
    refunds: {
      icon: RefreshCcw,
      defaultTitle: 'No Refunds',
      defaultDescription: 'When you process refunds, they will appear here.',
    },
    disputes: {
      icon: ShieldAlert,
      defaultTitle: 'No Active Disputes',
      defaultDescription: 'When customers dispute charges, they will appear here.',
    },
    'payment-methods': {
      icon: CreditCard,
      defaultTitle: 'No Payment Methods',
      defaultDescription: 'Saved payment methods will appear here.',
    },
    subscriptions: {
      icon: ClipboardList,
      defaultTitle: 'No Subscriptions',
      defaultDescription: 'Recurring subscriptions will appear here.',
    },
    analytics: {
      icon: Wallet,
      defaultTitle: 'No Analytics Data',
      defaultDescription: 'Analytics will appear once you start processing payments.',
    },
    search: {
      icon: Search,
      defaultTitle: 'No Results Found',
      defaultDescription: 'Try adjusting your search or filters.',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title || config.defaultTitle}</h3>
      <p className="text-muted-foreground max-w-sm mb-4">
        {description || config.defaultDescription}
      </p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

// ==================== ERROR STATES ====================

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function PaymentErrorState({
  title = 'Something Went Wrong',
  description = 'We encountered an error while loading payment data.',
  error,
  onRetry,
  onBack,
}: ErrorStateProps) {
  return (
    <Card className="border-red-200">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-2">{description}</p>
        {error && (
          <p className="text-sm text-red-600 max-w-sm mb-4">
            {typeof error === 'string' ? error : error.message}
          </p>
        )}
        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentNotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Payment Not Found</h3>
        <p className="text-muted-foreground max-w-sm mb-4">
          The payment you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={onBack} variant="outline">
          Back to Payments
        </Button>
      </CardContent>
    </Card>
  );
}

export function GatewayErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="flex items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900">Payment Gateway Issue</h3>
          <p className="text-sm text-orange-700">
            We're experiencing connectivity issues with our payment provider. Payments may be
            delayed.
          </p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ==================== STATUS INDICATORS ====================

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    succeeded: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: 'Succeeded',
    },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Failed' },
    refunded: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: RefreshCcw,
      label: 'Refunded',
    },
    pending: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, label: 'Pending' },
    cancelled: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Ban,
      label: 'Cancelled',
    },
    disputed: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: ShieldAlert,
      label: 'Disputed',
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.color} ${sizeClasses[size]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export function RefundStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    succeeded: { color: 'bg-green-100 text-green-800', label: 'Succeeded' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
  };

  const config = configs[status] || configs.pending;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${config.color} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}

export function DisputeStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<string, { color: string; label: string }> = {
    needs_response: { color: 'bg-red-100 text-red-800', label: 'Needs Response' },
    under_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
    won: { color: 'bg-green-100 text-green-800', label: 'Won' },
    lost: { color: 'bg-gray-100 text-gray-800', label: 'Lost' },
    warning_closed: { color: 'bg-blue-100 text-blue-800', label: 'Closed' },
  };

  const config = configs[status] || configs.needs_response;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${config.color} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}

export function GatewayStatusBadge({
  status,
  size = 'md',
}: {
  status: 'healthy' | 'degraded' | 'down';
  size?: 'sm' | 'md' | 'lg';
}) {
  const configs = {
    healthy: { color: 'bg-green-100 text-green-800', label: 'Healthy' },
    degraded: { color: 'bg-yellow-100 text-yellow-800', label: 'Degraded' },
    down: { color: 'bg-red-100 text-red-800', label: 'Down' },
  };

  const config = configs[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${config.color} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}

// ==================== ALERTS & BANNERS ====================

interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function PaymentAlertBanner({ type, title, message, action, onDismiss }: AlertBannerProps) {
  const configs = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: AlertCircle,
      iconColor: 'text-blue-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.bg} ${config.border} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-700 mt-1">{message}</p>
          {action && (
            <Button onClick={action.onClick} variant="outline" size="sm" className="mt-3">
              {action.label}
            </Button>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function PCIComplianceBanner({ compliant }: { compliant: boolean }) {
  if (compliant) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <h4 className="font-medium text-green-900">PCI Compliant</h4>
            <p className="text-sm text-green-700">
              Your payment system meets PCI DSS security standards.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900">PCI Compliance Issue</h4>
          <p className="text-sm text-red-700 mt-1">
            Your payment system is not PCI compliant. Please review your security settings.
          </p>
          <Button variant="outline" size="sm" className="mt-3">
            Review Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== LOADING STATES ====================

export function ProcessingPaymentState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          <DollarSign className="absolute inset-0 m-auto w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
        <p className="text-muted-foreground max-w-sm">
          Please wait while we process your payment. This may take a few moments.
        </p>
      </CardContent>
    </Card>
  );
}

export function PaymentSuccessState({
  amount,
  onContinue,
}: {
  amount: string;
  onContinue: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
        <p className="text-3xl font-bold text-green-600 mb-2">{amount}</p>
        <p className="text-muted-foreground max-w-sm mb-6">
          Your payment has been processed successfully. A confirmation email has been sent.
        </p>
        <Button onClick={onContinue} size="lg">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

export function PaymentFailedState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Payment Failed</h3>
        <p className="text-muted-foreground max-w-sm mb-2">
          We couldn't process your payment. Please check your payment details and try again.
        </p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <Button onClick={onRetry} variant="outline">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

// ==================== ACCESS DENIED ====================

export function PaymentAccessDeniedState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground max-w-sm">
          You don't have permission to access payment information. Please contact your
          administrator.
        </p>
      </CardContent>
    </Card>
  );
}

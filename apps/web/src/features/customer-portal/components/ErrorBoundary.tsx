import React, { type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@nemsalon/ui';
import '../portal.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback(this.state.error!, this.handleReset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="cp-error-boundary">
          <div className="cp-error-boundary-content">
            <div className="cp-error-icon">⚠️</div>
            <h2 className="cp-error-title">Noget gik galt</h2>
            <p className="cp-error-description">
              Der opstod en uventet fejl. Prøv at genindlæse siden.
            </p>
            <div className="cp-error-actions">
              <Button variant="primary" onClick={this.handleReset}>
                Prøv igen
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Genindlæs side
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="cp-error-details">
                <summary>Tekniske detaljer</summary>
                <pre className="cp-error-stack">{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  ComponentToWrap: React.ComponentType<P>,
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode),
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <ComponentToWrap {...props} />
      </ErrorBoundary>
    );
  };
}

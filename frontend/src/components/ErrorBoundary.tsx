// src/components/ErrorBoundary.tsx
// Composant Error Boundary pour capturer les erreurs React
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log l'erreur
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // Appeler le callback si fourni
    this.props.onError?.(error, errorInfo);
    
    // Ici on pourrait envoyer l'erreur à un service de monitoring (Sentry, etc.)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI par défaut
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            {/* Icône */}
            <div className="mx-auto w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={40} className="text-error" />
            </div>
            
            {/* Titre */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Oops ! Une erreur est survenue
            </h2>
            
            {/* Message */}
            <p className="text-gray-600 mb-6">
              Nous sommes désolés, quelque chose s'est mal passé. 
              Veuillez réessayer ou retourner à la page d'accueil.
            </p>
            
            {/* Détails de l'erreur (mode dev) */}
            {this.props.showDetails && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-sm font-mono text-error">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleRetry}
                leftIcon={<RefreshCw size={18} />}
              >
                Réessayer
              </Button>
              <Button
                variant="ghost"
                onClick={this.handleGoHome}
                leftIcon={<Home size={18} />}
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC pour envelopper les composants fonctionnels
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>
) => {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithErrorBoundary;
};

export default ErrorBoundary;

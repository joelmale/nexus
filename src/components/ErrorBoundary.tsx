import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary glass-panel error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <h3>Something went wrong</h3>
            <p>An error occurred while rendering this component.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <button
              className="btn btn-primary"
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for scene operations
export const SceneErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    children={children}
    fallback={
      <div className="scene-error-boundary glass-panel error">
        <div className="error-content">
          <span className="error-icon">🎭</span>
          <h3>Scene Error</h3>
          <p>The scene encountered an error and couldn't be displayed.</p>
          <p>
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('🎭 Scene operation error:', error, errorInfo);
      // Could send to error reporting service here
    }}
  />
);

// Specialized error boundary for canvas operations
export const CanvasErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    children={children}
    fallback={
      <div className="canvas-error-boundary glass-panel error">
        <div className="error-content">
          <span className="error-icon">🎨</span>
          <h3>Canvas Error</h3>
          <p>The scene canvas encountered an error and couldn't be rendered.</p>
          <p>
            This might be due to corrupted scene data or browser compatibility
            issues.
          </p>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('🎨 Canvas rendering error:', error, errorInfo);
      // Could send to error reporting service here
    }}
  />
);

// Specialized error boundary for token operations
export const TokenErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    children={children}
    fallback={
      <div className="token-error-boundary glass-panel error">
        <div className="error-content">
          <span className="error-icon">⚔️</span>
          <h3>Token Error</h3>
          <p>An error occurred while managing tokens.</p>
          <p>Some tokens may not display correctly.</p>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('⚔️ Token operation error:', error, errorInfo);
      // Could send to error reporting service here
    }}
  />
);

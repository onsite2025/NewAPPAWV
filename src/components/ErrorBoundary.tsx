'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 max-w-3xl mx-auto my-8">
          <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
          <div className="mb-4">
            <p className="font-medium">Error:</p>
            <pre className="bg-red-100 p-2 rounded mt-1 overflow-auto text-sm">
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div className="mb-4">
              <p className="font-medium">Stack trace:</p>
              <pre className="bg-red-100 p-2 rounded mt-1 overflow-auto text-sm">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
"use client";

import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="w-full max-w-md animate-scale-in">
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Oops! Something went wrong
              </h2>
              
              <p className="mb-6 text-sm text-gray-600">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => {
                    this.setState({ hasError: false });
                    window.location.reload();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-smooth hover:bg-red-700 focus-ring"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try Again
                </button>
                
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-smooth hover:bg-gray-50 focus-ring"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 rounded-lg bg-white p-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Error Details (dev only)
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-red-600">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error; 
  resetError?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {error?.message || "Something went wrong"}
          </p>
          {resetError && (
            <button
              onClick={resetError}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

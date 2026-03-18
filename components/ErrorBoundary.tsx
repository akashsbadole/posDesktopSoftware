"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="card p-8 max-w-md w-full text-center" role="alert">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(231,76,60,0.1)" }}>
              <AlertTriangle size={32} style={{ color: "#E74C3C" }} />
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#E74C3C" }}>
              Something went wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: "#9090A8" }}>
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="btn-accent flex-1 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost flex-1 flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

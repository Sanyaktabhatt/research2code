"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Called before local state resets - e.g. QueryErrorResetBoundary's reset, so a retried query isn't immediately re-thrown from cache. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.04] p-8 text-center">
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}

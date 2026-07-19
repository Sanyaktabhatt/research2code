"use client";

import * as React from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/feedback/error-boundary";
import { ApiError } from "@/lib/api/error";

interface AsyncSectionProps {
  children: React.ReactNode;
  /** Skeleton shown while any useSuspenseQuery inside `children` is pending. */
  fallback: React.ReactNode;
  /** Optional label shown in the error state, e.g. "recent papers". */
  label?: string;
}

/**
 * Standard Suspense + error-boundary wiring for one dashboard section backed
 * by useSuspenseQuery. QueryErrorResetBoundary's `reset` clears React
 * Query's cached error for the query that threw, so "Try again" actually
 * refetches instead of instantly re-throwing the same cached failure.
 */
export function AsyncSection({ children, fallback, label }: AsyncSectionProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={(error, retry) => <SectionError error={error} label={label} onRetry={retry} />}>
          <React.Suspense fallback={fallback}>{children}</React.Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function SectionError({ error, label, onRetry }: { error: Error; label?: string; onRetry: () => void }) {
  const detail = ApiError.isApiError(error) ? error.detail : error.message;

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center">
      <p className="text-sm font-medium text-foreground">
        Couldn&apos;t load {label ?? "this section"}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Try again
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div role="alert" className="flex max-w-lg flex-col items-center gap-3 rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Something went wrong</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    </div>
  );
}

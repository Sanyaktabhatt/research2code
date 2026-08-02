"use client";

import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOAuthProviders } from "@/features/auth/api/use-auth";
import { oauthAuthorizeUrl, type OAuthProvider } from "@/lib/api/endpoints/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.26A11.998 11.998 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.63l4.01 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

const PROVIDER_CONFIG: Record<OAuthProvider, { label: string; icon: React.ReactNode }> = {
  google: { label: "Continue with Google", icon: <GoogleIcon /> },
  github: { label: "Continue with GitHub", icon: <Github /> },
};

/** Shared "or continue with" row for login/signup - self-hides (no divider, no buttons) when no provider has credentials configured server-side. */
export function OAuthButtons() {
  const { data: providers, isLoading } = useOAuthProviders();

  if (isLoading || !providers || providers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
        {providers.map((provider) => (
          <Button key={provider} asChild variant="outline" type="button">
            <a href={oauthAuthorizeUrl(provider)}>
              {PROVIDER_CONFIG[provider].icon}
              {providers.length === 1 && PROVIDER_CONFIG[provider].label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}

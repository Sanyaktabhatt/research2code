"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/features/auth/api/use-auth";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { oauthErrorMessage } from "@/features/auth/lib/oauth-error-message";
import { ApiError } from "@/lib/api/error";

export default function LoginPage() {
  const [email, setEmail] = React.useState("ada@research2code.dev");
  const [password, setPassword] = React.useState("");
  const login = useLogin();
  const oauthError = oauthErrorMessage(useSearchParams().get("oauth_error"));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-muted-foreground">Welcome back to Research2Code.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {(login.isError || oauthError) && (
          <p role="alert" className="rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.05] px-3 py-2 text-sm text-destructive">
            {login.isError
              ? ApiError.isApiError(login.error)
                ? login.error.detail
                : "Something went wrong. Please try again."
              : oauthError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <OAuthButtons />

      <p className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-info underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

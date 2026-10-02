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
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-[15px] text-muted-foreground">Welcome back to Research2Code.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            className="h-10 text-[15px]"
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
            className="h-10 text-[15px]"
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

        <Button type="submit" size="lg" className="w-full text-[15px]" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <OAuthButtons />

      <p className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
        New to Research2Code?{" "}
        <Link href="/signup" className="font-medium text-info underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

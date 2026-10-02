"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignup } from "@/features/auth/api/use-auth";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { ApiError } from "@/lib/api/error";

export default function SignupPage() {
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const signup = useSignup();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    signup.mutate({ full_name: displayName, email, password });
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-[15px] text-muted-foreground">Start turning papers into runnable projects.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Name</Label>
          <Input
            className="h-10 text-[15px]"
            id="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </div>
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
            autoComplete="new-password"
          />
        </div>

        {signup.isError && (
          <p role="alert" className="rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.05] px-3 py-2 text-sm text-destructive">
            {ApiError.isApiError(signup.error) ? signup.error.detail : "Something went wrong. Please try again."}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full text-[15px]" disabled={signup.isPending}>
          {signup.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {signup.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <OAuthButtons />

      <p className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-info underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

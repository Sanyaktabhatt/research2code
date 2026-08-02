"use client";

import * as React from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useLogout, useUpdateProfile } from "@/features/auth/api/use-auth";
import { ApiError } from "@/lib/api/error";
import { formatDate, initials } from "@/lib/utils/formatters";

export default function SettingsPage() {
  const { data: user, isLoading } = useAuthGuard();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();

  const [fullName, setFullName] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (user && !dirty) setFullName(user.full_name ?? "");
  }, [user, dirty]);

  if (isLoading || !user) {
    return (
      <div className="max-w-2xl space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const displayName = user.full_name ?? user.email;
  const trimmedName = fullName.trim();
  const canSave = dirty && trimmedName.length > 0 && trimmedName !== (user.full_name ?? "");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    updateProfile.mutate(
      { full_name: trimmedName },
      { onSuccess: () => setDirty(false) },
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account.</p>
      </div>

      <SectionCard title="Profile" description="How you appear across Research2Code">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage alt={displayName} />
              <AvatarFallback className="text-base">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Display name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setDirty(true);
                }}
                maxLength={255}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled readOnly />
              <p className="text-xs text-muted-foreground">Your email is used to sign in and can&apos;t be changed here.</p>
            </div>

            {updateProfile.isError && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {ApiError.isApiError(updateProfile.error) ? updateProfile.error.detail : "Something went wrong. Please try again."}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={!canSave || updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {updateProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
              {updateProfile.isSuccess && !dirty && (
                <span className="text-xs text-muted-foreground">Saved.</span>
              )}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Account" description="Details about your account">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Role</dt>
            <dd className="mt-1">
              <Badge variant="secondary" className="gap-1 capitalize">
                {user.role === "admin" && <ShieldCheck className="size-3" aria-hidden="true" />}
                {user.role}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <Badge variant={user.is_active ? "success" : "destructive"}>{user.is_active ? "Active" : "Deactivated"}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Member since</dt>
            <dd className="mt-1 font-medium">{formatDate(user.created_at)}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Session">
        <Button variant="outline" size="sm" onClick={logout} className="text-destructive hover:text-destructive">
          <LogOut />
          Log out
        </Button>
      </SectionCard>
    </div>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { initials } from "@/lib/utils/formatters";

export default function AccountSettingsPage() {
  const { data: user, isLoading } = useAuthGuard();

  if (isLoading || !user) return <CardSkeleton className="max-w-lg" />;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Your profile information.</p>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-border p-4">
        <Avatar className="size-12">
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.displayName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </div>
  );
}

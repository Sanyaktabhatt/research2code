import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}

/** Shared title/description/action chrome for every dashboard widget card. */
export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-[13px] font-semibold">{title}</CardTitle>
          {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="group/link flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {action.label}
            <ArrowRight className="size-3 transition-transform duration-150 group-hover/link:translate-x-0.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-0">{children}</CardContent>
    </Card>
  );
}

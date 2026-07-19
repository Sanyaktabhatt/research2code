"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-[13px] text-muted-foreground", className)}>
      <Link href="/projects" className="flex items-center rounded p-0.5 transition-colors hover:text-foreground">
        <Home className="size-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            {item.href && !isLast ? (
              <Link href={item.href} className="max-w-[14rem] truncate rounded transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={cn("max-w-[16rem] truncate", isLast && "font-medium text-foreground")}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

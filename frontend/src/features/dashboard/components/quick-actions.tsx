"use client";

import Link from "next/link";
import { FolderPlus, LayoutGrid, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { href: "/projects/new", label: "New project", icon: FolderPlus, primary: true },
  { href: "/projects", label: "Browse projects", icon: LayoutGrid },
  { href: "/graph", label: "Explore a graph", icon: Share2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Button key={action.label} asChild variant={action.primary ? "default" : "outline"} size="sm">
          <Link href={action.href}>
            <action.icon />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

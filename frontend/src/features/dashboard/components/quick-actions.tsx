"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FolderPlus, LayoutGrid, Settings, Share2 } from "lucide-react";
import { tapScale } from "@/lib/motion";

const ACTIONS = [
  { href: "/projects/new", label: "New project", icon: FolderPlus, primary: true },
  { href: "/projects", label: "Browse projects", icon: LayoutGrid },
  { href: "/projects", label: "Explore a graph", icon: Share2 },
  { href: "/settings/account", label: "Settings", icon: Settings },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <motion.div key={action.label} {...tapScale}>
          <Link
            href={action.href}
            className={
              action.primary
                ? "group inline-flex items-center gap-2 rounded-full bg-gradient-brand bg-[length:160%_160%] bg-[position:0%_50%] px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-[background-position,box-shadow] duration-200 hover:bg-[position:100%_50%] hover:shadow-glow"
                : "group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            }
          >
            <action.icon className="size-4 transition-transform duration-200 group-hover:scale-110" />
            {action.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FileText, FolderGit2, LayoutDashboard, Moon, Settings, Sun, Workflow } from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useProjects } from "@/features/projects/api/use-projects";
import { useUiStore } from "@/stores/ui-store";

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const { data } = useProjects(1, 50);
  const projects = data?.items;

  useKeyboardShortcut({ key: "k", mod: true }, () => setOpen(!open));

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects?.slice(0, 6).map((project) => (
            <CommandItem key={project.id} onSelect={() => go(`/projects/${project.id}`)}>
              <FolderGit2 />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <Workflow />
            All projects
          </CommandItem>
          <CommandItem onSelect={() => go("/settings/account")}>
            <Settings />
            Settings
          </CommandItem>
          <CommandItem onSelect={() => go("/projects/new")}>
            <FileText />
            New project
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => { setTheme("light"); setOpen(false); }}>
            <Sun />
            Light theme
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("dark"); setOpen(false); }}>
            <Moon />
            Dark theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

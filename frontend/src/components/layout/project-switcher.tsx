"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, FolderGit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/features/projects/api/use-projects";
import { cn } from "@/lib/utils/cn";

export function ProjectSwitcher() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const params = useParams<{ projectId?: string }>();
  const { data, isLoading } = useProjects(1, 50);
  const projects = data?.items;

  const activeProject = projects?.find((p) => p.id === params.projectId);

  if (isLoading) {
    return <Skeleton className="h-9 w-40 sm:w-56" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-40 justify-between font-medium text-foreground sm:w-56"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FolderGit2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{activeProject?.name ?? "Select project"}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup heading="Projects">
              {projects?.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    router.push(`/projects/${project.id}`);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 size-4", project.id === activeProject?.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  router.push("/projects/new");
                  setOpen(false);
                }}
              >
                <Plus className="mr-2 size-4" />
                New project
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

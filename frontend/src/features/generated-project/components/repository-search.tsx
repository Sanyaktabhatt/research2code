import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RepositorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function RepositorySearch({ value, onChange }: RepositorySearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search files…"
        className="h-7 pl-7 pr-7 text-xs"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 size-6 -translate-y-1/2"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

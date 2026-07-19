import { ExternalLink, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";

interface TensorBoardCardProps {
  logDir: string | null;
  url: string | null;
  isLoading: boolean;
}

export function TensorBoardCard({ logDir, url, isLoading }: TensorBoardCardProps) {
  if (!logDir) {
    return (
      <SectionCard title="TensorBoard">
        <EmptyState icon={LineChart} title="Not available" description="This run has no TensorBoard log directory." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="TensorBoard">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={url ? "success" : "secondary"}>{isLoading ? "Resolving…" : url ? "Available" : "Unavailable"}</Badge>
        </div>
        {url && <p className="truncate text-xs text-muted-foreground">{url}</p>}
        {url ? (
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Launch TensorBoard
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <ExternalLink className="size-3.5" />
            Launch TensorBoard
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

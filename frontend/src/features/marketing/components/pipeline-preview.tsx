import { CircleCheck, FileText, FolderCode, LoaderCircle, Network, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Landing-page product visualization: one paper moving through the real
 * pipeline stages (parse -> extract methodology -> generate project -> run).
 * Pure markup, no data fetching; captioned as an illustrative example so it
 * never reads as live data or a performance claim.
 */
export function PipelinePreview({ className }: { className?: string }) {
  return (
    <figure className={cn("w-full", className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-foreground/80">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">attention_is_all_you_need.pdf</span>
          </span>
          <span className="shrink-0 rounded-sm border border-border bg-card px-1.5 py-px text-[11px] font-medium text-muted-foreground">
            Pipeline
          </span>
        </div>

        <ol className="px-4 py-4 sm:px-5">
          <Stage index={1} title="Paper parsed" icon={FileText} status="done">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {[
                ["Abstract", "p.1"],
                ["3 Model Architecture", "p.3"],
                ["5 Training", "p.7"],
                ["6 Results", "p.8"],
              ].map(([section, page]) => (
                <li key={section} className="flex justify-between gap-2">
                  <span className="truncate">{section}</span>
                  <span className="font-mono tabular-nums text-muted-foreground/70">{page}</span>
                </li>
              ))}
            </ul>
          </Stage>

          <Stage index={2} title="Methodology extracted" icon={Network} status="done">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {[
                ["Task", "Machine translation"],
                ["Model", "Transformer encoder–decoder"],
                ["Dataset", "WMT 2014 En–De"],
                ["Optimizer", "Adam with warmup schedule"],
              ].map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="truncate font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Stage>

          <Stage index={3} title="Project generated" icon={FolderCode} status="done">
            <div className="flex flex-wrap gap-1.5">
              {["model.py", "train.py", "data.py", "config.yaml"].map((file) => (
                <span key={file} className="rounded-sm border border-border bg-muted/60 px-1.5 py-px font-mono text-[11px] text-foreground/80">
                  {file}
                </span>
              ))}
            </div>
            <pre className="mt-2 overflow-hidden rounded-md bg-[hsl(220_32%_10%)] px-3 py-2 font-mono text-[11px] leading-5 text-[hsl(214_24%_86%)]">
              <span className="text-[hsl(258_60%_76%)]">class</span> <span className="text-[hsl(196_60%_66%)]">Transformer</span>(nn.Module):{"\n"}
              {"    "}<span className="text-[hsl(258_60%_76%)]">def</span> <span className="text-[hsl(196_60%_66%)]">forward</span>(self, src, tgt):
            </pre>
          </Stage>

          <Stage index={4} title="Experiment running" icon={Play} status="running" isLast>
            <div className="rounded-md border border-border font-mono text-[11px] leading-5">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1 text-muted-foreground">
                <span>run v1 · gpu · docker</span>
                <span className="flex items-center gap-1 text-info">
                  <span className="size-1.5 rounded-full bg-info" aria-hidden="true" />
                  running
                </span>
              </div>
              <div className="px-3 py-1.5 text-foreground/80">
                <p>
                  <span className="text-primary">$</span> python train.py --config config.yaml
                </p>
                <p className="text-muted-foreground">tracking metrics in MLflow · TensorBoard</p>
              </div>
            </div>
          </Stage>
        </ol>
      </div>
      <figcaption className="mt-2.5 text-center text-xs text-muted-foreground">Illustrative example of a project workspace pipeline.</figcaption>
    </figure>
  );
}

function Stage({
  index,
  title,
  icon: Icon,
  status,
  isLast = false,
  children,
}: {
  index: number;
  title: string;
  icon: typeof FileText;
  status: "done" | "running";
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("relative flex gap-3.5", !isLast && "pb-4")}>
      {!isLast && <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-border" aria-hidden="true" />}
      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex h-7 items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-foreground">
            <span className="mr-1.5 font-mono text-[11px] font-medium text-muted-foreground">{String(index).padStart(2, "0")}</span>
            {title}
          </p>
          {status === "done" ? (
            <CircleCheck className="size-4 shrink-0 text-success" aria-label="Completed" />
          ) : (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-info" aria-label="In progress" />
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

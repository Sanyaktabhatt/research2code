export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Assistant is generating a response" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

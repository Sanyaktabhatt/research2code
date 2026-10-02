import * as React from "react"

import { cn } from "@/lib/utils/cn"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-card px-3 py-2 text-base shadow-xs transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground/70 hover:border-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/15 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

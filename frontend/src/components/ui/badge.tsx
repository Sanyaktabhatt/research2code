import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-xs font-medium leading-[1.125rem] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary",
        secondary:
          "border-border bg-muted text-muted-foreground",
        destructive:
          "border-destructive/30 bg-destructive/[0.07] text-destructive",
        success:
          "border-success/30 bg-success/[0.07] text-success",
        warning:
          "border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
        info:
          "border-info/30 bg-info/[0.07] text-info",
        outline: "border-border-strong text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5",
        outline:
          "text-foreground border-border/50 bg-background/50 hover:bg-background hover:shadow-sm hover:-translate-y-0.5",
        success:
          "border-transparent bg-green-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
        warning:
          "border-transparent bg-orange-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
        info:
          "border-transparent bg-blue-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
        gradient:
          "border-0 bg-gradient-to-r from-primary to-purple-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5",
        soft:
          "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm hover:-translate-y-0.5",
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
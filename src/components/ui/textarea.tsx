import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm transition-all duration-200 ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
          "scrollbar-thin",
          className
        )}
        style={{
          borderColor: "var(--color-input)",
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)"
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 
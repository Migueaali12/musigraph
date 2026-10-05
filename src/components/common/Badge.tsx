import type { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  variant?: "accent" | "muted"
}

export function Badge({ children, variant = "accent" }: BadgeProps) {
  const styles =
    variant === "accent"
      ? "bg-coral-vibrant/10 text-coral-deep dark:text-coral-vibrant"
      : "bg-surface-elevated text-muted-foreground"

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  )
}

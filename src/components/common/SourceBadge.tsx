import { SOURCE_LABELS, type SourceId, type SourceStatus } from "@/services/sources"

interface SourceBadgeProps {
  source: SourceId
  /** Provenance status; omitted for item-level badges (always "ok"). */
  status?: SourceStatus
  /** Optional link (methodology page anchor). */
  href?: string
}

/** Small provenance chip: which source produced this data. */
export function SourceBadge({ source, status, href }: SourceBadgeProps) {
  const inactive = status === "error" || status === "timeout" || status === "skipped"
  const className = `chip border-border bg-surface-elevated ${
    inactive ? "text-muted/60" : "text-muted"
  }`
  const title = inactive ? status : undefined

  if (href) {
    return (
      <a
        href={href}
        className={`${className} transition-colors hover:text-accent`}
        title={title}
      >
        {SOURCE_LABELS[source]}
      </a>
    )
  }

  return (
    <span className={className} title={title}>
      {SOURCE_LABELS[source]}
    </span>
  )
}

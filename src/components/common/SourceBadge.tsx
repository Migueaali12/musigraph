import { SOURCE_LABELS, type SourceId, type SourceStatus } from "@/services/sources"

interface SourceBadgeProps {
  source: SourceId
  /** Provenance status; omitted for item-level badges (always "ok"). */
  status?: SourceStatus
}

/** Small provenance chip: which source produced this data. */
export function SourceBadge({ source, status }: SourceBadgeProps) {
  const inactive = status === "error" || status === "timeout" || status === "skipped"
  return (
    <span
      className={`chip border-border bg-surface-elevated ${
        inactive ? "text-muted/60" : "text-muted"
      }`}
      title={inactive ? status : undefined}
    >
      {SOURCE_LABELS[source]}
    </span>
  )
}

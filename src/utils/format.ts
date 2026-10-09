// Shared display formatters

/** "The Beatles" -> "TB", "Queen" -> "Q" */
export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** Removes a trailing colon from dictionary labels ("Country:" -> "Country") */
export function stripColon(label: string) {
  return label.replace(/\s*:\s*$/, "")
}

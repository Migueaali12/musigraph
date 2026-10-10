// ── Methodology section wrapper ────────────────────────────────────────────
// Server component: hairline-separated section with a consistent heading
// hierarchy (h2) used across the /[lang]/data page.

import type { ReactNode } from "react"

interface MethodologySectionProps {
  /** Anchor target (e.g. "wikidata" for provenance badges). */
  id?: string
  title: string
  intro: string
  children?: ReactNode
}

export function MethodologySection({
  id,
  title,
  intro,
  children,
}: MethodologySectionProps) {
  return (
    <section id={id} className='scroll-mt-24 border-t border-border pt-10'>
      <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
      <p className='mt-3 max-w-prose text-[15px] leading-relaxed text-muted'>
        {intro}
      </p>
      {children ? <div className='mt-7'>{children}</div> : null}
    </section>
  )
}
